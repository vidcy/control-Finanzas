import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  ShoppingBag,
  Layers,
  DollarSign,
  FileText,
  Globe,
  Barcode,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  Check,
  Sparkles,
  Smartphone,
  Eye,
  Store,
  TrendingUp,
  Receipt,
  ScanLine,
} from "lucide-react";

interface Chapter {
  id: number;
  title: string;
  badge: string;
  subtitle: string;
  duration: number; // seconds
  icon: any;
  accent: string;
  bgBadge: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "Venta POS Táctil & Código de Barras",
    badge: "MÓDULO PUNTO DE VENTA",
    subtitle: "Cobros en menos de 3 segundos con escáner físico o táctil, cobro mixto (Yape, Plin, Efectivo, Tarjeta) y ticket térmico instantáneo.",
    duration: 8,
    icon: ShoppingBag,
    accent: "from-blue-600 to-indigo-600",
    bgBadge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: 2,
    title: "Series de Calzado & Curvas de Tallas",
    badge: "INVENTARIO INTELIGENTE",
    subtitle: "Un solo artículo contiene todas sus tallas (34-39) y pares disponibles en fila horizontal, sin duplicar productos.",
    duration: 8,
    icon: Layers,
    accent: "from-indigo-600 to-purple-600",
    bgBadge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: 3,
    title: "Arqueo de Caja & Cierre Ciego",
    badge: "TESORERÍA Y CAJA CHICA",
    subtitle: "El cajero declara lo que tiene en mano sin ver el saldo del sistema. Detección automática de descuadres y balance en vivo.",
    duration: 8,
    icon: DollarSign,
    accent: "from-emerald-600 to-teal-600",
    bgBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: 4,
    title: "Facturación Electrónica SUNAT",
    badge: "BOLETAS Y FACTURAS XML",
    subtitle: "Comprobantes homologados con código hash, código QR reglamentario y envío directo sin caídas de servidor.",
    duration: 8,
    icon: FileText,
    accent: "from-amber-600 to-orange-600",
    bgBadge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: 5,
    title: "Catálogo Web Digital Sincronizado",
    badge: "VENTAS ONLINE 24/7",
    subtitle: "Tu tienda web propia conectada en tiempo real al inventario de tu negocio, con carrito y pedidos listos para WhatsApp.",
    duration: 8,
    icon: Globe,
    accent: "from-sky-600 to-cyan-600",
    bgBadge: "bg-sky-50 text-sky-700 border-sky-200",
  },
];

export default function ThinkSystemShowcase() {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"video" | "interactive">("video");

  // Simulator States
  const [cartItems, setCartItems] = useState([
    { id: 1, name: "Stiletto Charol Tacón Aguja (Talla 37)", price: 145, qty: 1, code: "VZ-37" },
    { id: 2, name: "Plantilla Confort Gel Anatómica", price: 25, qty: 1, code: "ACC-01" },
  ]);
  const [scannedFeedback, setScannedFeedback] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [selectedShoeSize, setSelectedShoeSize] = useState("37");

  const currentChapter = CHAPTERS[activeChapterIndex];

  // Auto-progress video timer
  useEffect(() => {
    if (!isPlaying || activeTab !== "video") return;

    const interval = 100;
    const step = (interval / (currentChapter.duration * 1000)) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveChapterIndex((prevIdx) => (prevIdx + 1) % CHAPTERS.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, activeChapterIndex, activeTab, currentChapter.duration]);

  const handleSelectChapter = (index: number) => {
    setActiveChapterIndex(index);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleAddInteractiveItem = () => {
    setScannedFeedback(true);
    setTimeout(() => setScannedFeedback(false), 900);
    setCartItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `Calzado Serie Oficial Talla ${selectedShoeSize}`,
        price: 135,
        qty: 1,
        code: `PR-${selectedShoeSize}`,
      },
    ]);
  };

  const cartTotal = cartItems.reduce((acc, it) => acc + it.price * it.qty, 0);

  return (
    <section id="sistema-showcase" className="relative py-16 sm:py-24 bg-gradient-to-b from-[#f8fafc] via-white to-[#f1f5f9] text-slate-900 overflow-hidden w-full border-y border-slate-200/80">
      {/* Soft Ambient Light Glows */}
      <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-indigo-100/60 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[600px] h-[600px] bg-sky-100/60 rounded-full blur-[140px] pointer-events-none" />

      {/* Full Width Edge-to-Edge Container */}
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 relative z-10">
        {/* Header Section */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black tracking-widest uppercase mb-4 shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>MÓDULOS EN VIVO • SISTEMA REAL THINK ERP</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight mb-4">
            Descubre las funcionalidades reales de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600">
              THINK ERP
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium max-w-2xl mx-auto">
            Todas las herramientas operan conectadas: desde tu teléfono o computadora puedes cobrar en caja, controlar series de calzado, auditar cierres ciegos y emitir comprobantes SUNAT.
          </p>

          {/* Mode Switcher */}
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200/90 mt-6 shadow-md">
            <button
              onClick={() => setActiveTab("video")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "video"
                  ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Demostración en Video Guiada</span>
            </button>
            <button
              onClick={() => setActiveTab("interactive")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "interactive"
                  ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Simulador Interactivo en Vivo</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODE A: VIDEO TOUR WITH CLEAN LIGHT DESIGN
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "video" && (
          <div className="space-y-6">
            {/* Chapters Navigation Rail (Edge-to-Edge 5 cols) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CHAPTERS.map((ch, idx) => {
                const isActive = idx === activeChapterIndex;
                const Icon = ch.icon;

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChapter(idx)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden group ${
                      isActive
                        ? "bg-white border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                        : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    {isActive && (
                      <div
                        className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      />
                    )}

                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          isActive
                            ? "bg-gradient-to-tr " + ch.accent + " text-white shadow-md"
                            : "bg-slate-100 text-slate-600 group-hover:text-indigo-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Capítulo 0{ch.id}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-black leading-tight line-clamp-1 transition-colors ${
                        isActive ? "text-indigo-950" : "text-slate-700 group-hover:text-indigo-600"
                      }`}
                    >
                      {ch.title}
                    </h4>
                  </button>
                );
              })}
            </div>

            {/* Main Showcase Stage (Edge to Edge, Clean White & Crisp Slate) */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-600 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>think.ccoplex.com/{currentChapter.id === 1 ? "business-pos" : currentChapter.id === 2 ? "business-inventory" : currentChapter.id === 3 ? "business-cash-register" : currentChapter.id === 4 ? "business-billing" : "catalogo"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${currentChapter.bgBadge}`}>
                    {currentChapter.badge}
                  </span>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-slate-800 text-[11px] font-bold">SISTEMA ACTIVO</span>
                  </div>
                </div>
              </div>

              {/* Stage Body */}
              <div className="p-6 sm:p-10 lg:p-12 min-h-[480px] flex flex-col justify-between bg-gradient-to-b from-white via-slate-50/30 to-indigo-50/20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentChapter.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex-1 flex flex-col justify-center"
                  >
                    {/* SCENE 1: POS TÁCTIL & CÓDIGOS DE BARRA */}
                    {currentChapter.id === 1 && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4 text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                            <ScanLine className="w-4 h-4 text-blue-600" />
                            <span>Escáner Rápido USB, Bluetooth o Táctil</span>
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                            Punto de Venta Diseñado para Despachar en Segundos
                          </h3>
                          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                            Sin filas lentas. Tu cajero escanea el código de barras o toca la imagen del producto, asigna al vendedor para el cálculo automático de comisiones y cobra con <strong>Yape, Plin, Tarjeta o Efectivo</strong>.
                          </p>

                          <div className="grid grid-cols-3 gap-3 pt-2">
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Respuesta</span>
                              <span className="text-lg font-black text-blue-600">0.2s Inmediato</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Impresión</span>
                              <span className="text-lg font-black text-emerald-600">Ticket 58/80mm</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Cobro Mixto</span>
                              <span className="text-lg font-black text-purple-600">Multimoneda</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive POS Ticket Preview Simulation */}
                        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-xl space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                                T
                              </div>
                              <span className="text-xs font-black text-slate-900">VENTA EN PROCESO #0482</span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                              Caja Abierta
                            </span>
                          </div>

                          <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                              <span>1x Calzado Charol (Talla 37)</span>
                              <span className="text-slate-900 font-bold">S/ 145.00</span>
                            </div>
                            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                              <span>1x Plantilla Gel Anatómica</span>
                              <span className="text-slate-900 font-bold">S/ 25.00</span>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-indigo-700 font-bold block uppercase">TOTAL A COBRAR</span>
                              <span className="text-2xl font-black text-indigo-950">S/ 170.00</span>
                            </div>
                            <div className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md">
                              <Check className="w-4 h-4" />
                              <span>COBRADO YAPE</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                              <Printer className="w-3.5 h-3.5 text-indigo-600" /> Ticket impreso
                            </span>
                            <span className="text-emerald-600 font-bold">Stock rebajado al instante</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCENE 2: INVENTARIO CON CURVAS DE SERIES DE TALLAS */}
                    {currentChapter.id === 2 && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4 text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                            <Layers className="w-4 h-4 text-purple-600" />
                            <span>Motor Exclusivo de Curvas de Calzado & Confección</span>
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                            Un Solo Modelo con todas sus Tallas y Medidas en Fila
                          </h3>
                          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                            En lugar de registrar 6 o 8 productos separados para cada talla, registras el modelo y el sistema genera su curva de tallas (34, 35, 36, 37, 38, 39) con control de pares disponibles en tiempo real.
                          </p>

                          <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-md space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                              <span>Curva de Serie: Stiletto Fiesta 2026</span>
                              <span className="text-indigo-600 font-black">6 Pares / Serie</span>
                            </div>
                            <div className="grid grid-cols-6 gap-2 pt-2">
                              {[
                                { size: "34", stock: 1 },
                                { size: "35", stock: 2 },
                                { size: "36", stock: 4 },
                                { size: "37", stock: 3 },
                                { size: "38", stock: 2 },
                                { size: "39", stock: 1 },
                              ].map((it) => (
                                <div
                                  key={it.size}
                                  className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 text-center"
                                >
                                  <span className="text-[10px] text-slate-500 block font-bold">Talla</span>
                                  <span className="text-base font-black text-slate-900 block">{it.size}</span>
                                  <span className="text-[10px] font-bold text-emerald-600">{it.stock} pares</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Model Card Simulation */}
                        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-purple-200 shadow-xl space-y-4">
                          <div className="aspect-video rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 relative overflow-hidden">
                            <div className="text-center p-4">
                              <span className="text-4xl block mb-1">👠</span>
                              <span className="text-sm font-black text-slate-900 block">Stiletto Charol Tacón Aguja</span>
                              <span className="text-xs text-purple-600 font-bold">Taco 9 cm • Curva Completa</span>
                            </div>
                            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              13 PARES DISPONIBLES
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">PRECIO PAR</span>
                              <span className="text-2xl font-black text-slate-900">S/ 149.00</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">PRECIO X SERIE</span>
                              <span className="text-xl font-black text-purple-600">S/ 720.00</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCENE 3: CAJA CIEGA & ARQUEO */}
                    {currentChapter.id === 3 && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4 text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            <span>Arqueos Ciegos de Caja & Cero Fugas de Dinero</span>
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                            Control Blindado de Turnos y Movimientos
                          </h3>
                          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                            Tu personal cuenta el dinero físico en mano sin saber el número calculado por el sistema. El sistema compara en el acto y emite el reporte detallando si hubo sobrante o faltante exacto al céntimo.
                          </p>

                          <div className="grid grid-cols-3 gap-3 pt-2">
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Ventas Turno</span>
                              <span className="text-lg font-black text-slate-900">S/ 2,480.00</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Declarado</span>
                              <span className="text-lg font-black text-emerald-600">S/ 2,480.00</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Descuadre</span>
                              <span className="text-lg font-black text-emerald-600">S/ 0.00 EXACTO</span>
                            </div>
                          </div>
                        </div>

                        {/* Shift Card Simulation */}
                        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-xl space-y-3">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-xs font-black text-slate-900">ARQUEO DE TURNO EN VIVO</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[10px]">
                              CUADRADO
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                              <span>Monto Inicial Apertura</span>
                              <span className="font-bold text-slate-900">S/ 200.00</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                              <span>Ventas Efectivo</span>
                              <span className="font-bold text-slate-900">S/ 1,350.00</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                              <span>Ventas Yape / Plin</span>
                              <span className="font-bold text-sky-600">S/ 930.00</span>
                            </div>
                            <div className="flex justify-between py-1 text-slate-600">
                              <span>Egresos Menores</span>
                              <span className="font-bold text-rose-600">- S/ 120.00</span>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[10px] text-emerald-800 font-bold block uppercase">TOTAL FÍSICO EN GAVETA</span>
                            <span className="text-2xl font-black text-emerald-600">S/ 1,430.00</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCENE 4: FACTURACIÓN ELECTRÓNICA SUNAT */}
                    {currentChapter.id === 4 && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4 text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            <Receipt className="w-4 h-4 text-amber-600" />
                            <span>Conexión Homologada y Directa a Servidores SUNAT</span>
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                            Boletas y Facturas Electrónicas al Instante
                          </h3>
                          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                            Emite tus comprobantes oficiales con código hash, código QR y constancia de recepción (CDR) en tiempo real. Formato ticket térmico de 58/80mm o PDF A4 para empresas.
                          </p>

                          <div className="flex flex-wrap gap-2 pt-2">
                            {["Boletas Electrónicas", "Facturas con RUC", "Notas de Crédito", "Tickets Térmicos", "Validación CDR"].map((it) => (
                              <span key={it} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                                ✓ {it}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Electronic Voucher Simulation */}
                        <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 shadow-xl border-2 border-amber-300 text-left font-sans">
                          <div className="text-center pb-3 border-b border-dashed border-slate-300">
                            <span className="text-sm font-black tracking-tight block text-slate-900">CORPORACIÓN CCOPLEX S.A.C.</span>
                            <span className="text-[10px] text-slate-500 block font-mono">RUC: 20601234567</span>
                            <span className="text-xs font-black text-indigo-700 mt-1 block">
                              BOLETA DE VENTA ELECTRÓNICA
                            </span>
                            <span className="text-[11px] font-mono text-slate-800 font-bold">B001 - 0004892</span>
                          </div>

                          <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-slate-300 font-mono">
                            <div className="flex justify-between">
                              <span>1x Calzado Tacón Fiesta</span>
                              <span className="font-bold">S/ 120.00</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-[10px]">
                              <span>Op. Gravada:</span>
                              <span>S/ 101.69</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-[10px]">
                              <span>IGV (18%):</span>
                              <span>S/ 18.31</span>
                            </div>
                          </div>

                          <div className="pt-3 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block uppercase">TOTAL VENTA</span>
                              <span className="text-2xl font-black text-slate-950">S/ 120.00</span>
                            </div>
                            <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-center text-[9px] font-mono font-bold text-slate-500 text-center">
                              [QR SUNAT]
                            </div>
                          </div>
                          <div className="mt-3 text-center">
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-black uppercase">
                              ✓ ACEPTADO POR SUNAT (CDR 0000)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCENE 5: CATÁLOGO WEB SINCRONIZADO */}
                    {currentChapter.id === 5 && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4 text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
                            <Globe className="w-4 h-4 text-sky-600" />
                            <span>Tu Tienda Virtual Pública 24/7 de Canto a Canto</span>
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                            Vitrina Web con Tallas y Pedidos Directos a WhatsApp
                          </h3>
                          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                            Diseño amplio y moderno estilo Adidas y Coolbox. Tus clientes eligen la talla o medida bajo cada producto, revisan el stock disponible y te envían el pedido ordenado y listo para cobrar.
                          </p>

                          <div className="flex items-center gap-3 pt-2">
                            <a
                              href="/catalogo"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Abrir Catálogo Web Público</span>
                              <ChevronRight className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Mobile Catalog Preview */}
                        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-sky-200 shadow-xl space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-sky-600" />
                              <span className="text-xs font-black text-slate-900">TIENDA VIRTUAL EN VIVO</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-bold">● Sincronizado</span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0">
                              👠
                            </div>
                            <div className="flex-1 text-left">
                              <span className="text-xs font-bold text-slate-900 block">Stiletto Charol Tacón Aguja</span>
                              <div className="flex gap-1 mt-1">
                                {["35", "36", "37", "38"].map((sz) => (
                                  <span key={sz} className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700">
                                    {sz}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="text-sm font-black text-emerald-600">S/ 145.00</span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-800">
                            <span>Botón de Pedido WhatsApp</span>
                            <span className="text-xs font-black text-emerald-700">1 Clic</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Bottom Video Controls Bar */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-11 h-11 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                      title={isPlaying ? "Pausar demostración" : "Reproducir demostración"}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                        CAPÍTULO {currentChapter.id} DE {CHAPTERS.length}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 block truncate max-w-[240px]">
                        {currentChapter.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 max-w-md w-full px-2 hidden md:block">
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveChapterIndex((prev) => (prev > 0 ? prev - 1 : CHAPTERS.length - 1));
                        setProgress(0);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => {
                        setActiveChapterIndex((prev) => (prev + 1) % CHAPTERS.length);
                        setProgress(0);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-black text-white cursor-pointer shadow-md"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODE B: INTERACTIVE HANDS-ON SIMULATOR (LIGHT THEME)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "interactive" && (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-black uppercase tracking-wider border border-amber-200">
                ⚡ PRUEBA EN VIVO EL SISTEMA
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                Simulador del Punto de Venta THINK
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 font-medium">
                Selecciona la talla en la curva de calzado y simula el escaneo y cobro inmediato.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Controls */}
              <div className="md:col-span-7 space-y-5 text-left">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    1. Elige una Talla de la Serie de Calzado:
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {["34", "35", "36", "37", "38", "39"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedShoeSize(sz)}
                        className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          selectedShoeSize === sz
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                            : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        T.{sz}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddInteractiveItem}
                    className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-98"
                  >
                    <Barcode className="w-4 h-4" />
                    <span>Escanear y Agregar Talla {selectedShoeSize} (S/ 135.00)</span>
                  </button>
                  {scannedFeedback && (
                    <span className="text-xs text-emerald-600 font-bold block text-center animate-bounce">
                      ¡BEEP! Producto escaneado y agregado a la venta en 0.2s
                    </span>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    2. Selecciona Método de Pago Rápido:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setIsPaid(true)}
                      className="py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all cursor-pointer shadow-md"
                    >
                      Pagar con Yape
                    </button>
                    <button
                      onClick={() => setIsPaid(true)}
                      className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-md"
                    >
                      Pagar Efectivo
                    </button>
                    <button
                      onClick={() => setIsPaid(true)}
                      className="py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition-all cursor-pointer shadow-md"
                    >
                      Tarjeta / POS
                    </button>
                  </div>
                </div>
              </div>

              {/* Cart Output */}
              <div className="md:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                    <span className="text-xs font-black text-slate-900">TICKET DE VENTA EN VIVO</span>
                    <span className="text-[10px] font-bold text-slate-500">{cartItems.length} artículos</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cartItems.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs py-1.5 border-b border-slate-200 text-slate-700">
                        <span className="truncate max-w-[170px]">{it.name}</span>
                        <span className="font-bold text-slate-900">S/ {it.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 mt-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500 font-bold uppercase">TOTAL</span>
                    <span className="text-2xl font-black text-emerald-600">S/ {cartTotal.toFixed(2)}</span>
                  </div>

                  {isPaid ? (
                    <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold text-center">
                      <Check className="w-4 h-4 inline mr-1 text-emerald-700" />
                      ¡Venta Cobrada con Éxito! Stock rebajado.
                      <button
                        onClick={() => setIsPaid(false)}
                        className="block mx-auto mt-2 text-[10px] text-indigo-700 font-bold underline cursor-pointer"
                      >
                        Nueva venta
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsPaid(true)}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                    >
                      Finalizar Venta e Imprimir Comprobante
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
