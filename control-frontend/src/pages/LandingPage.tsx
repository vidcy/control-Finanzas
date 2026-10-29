import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Smartphone,
  LineChart,
  CheckCircle2,
  Mail,
  Phone,
  Sparkles,
  Building,
  Calendar,
  Zap,
  AlertTriangle,
  Play,
  Check,
  Percent,
  Layers,
  Printer,
  Barcode,
  Store,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  ChevronDown,
  ShoppingBag,
  Clock,
  Award,
  Users,
  XCircle,
  HelpCircle,
  QrCode,
  ArrowUpRight,
  CheckCircle,
} from "lucide-react";
import ThinkLiveChatWidget from "../components/landing/ThinkLiveChatWidget";
import ThinkSystemShowcase from "../components/landing/ThinkSystemShowcase";
import { createLeadRequest } from "../services/lead.api";
import { toast } from "react-hot-toast";

export default function LandingPage() {
  useEffect(() => {
    document.title = "THINK ERP & POS | El Sistema que Más Vende para Tiendas de Calzado y Retail en Perú";
  }, []);

  // WhatsApp Express Capture
  const [expressPhone, setExpressPhone] = useState("");
  const [expressSubmitted, setExpressSubmitted] = useState(false);
  const [expressLoading, setExpressLoading] = useState(false);

  // Tab interactivo del Hero Simulator
  const [activeHeroTab, setActiveHeroTab] = useState<"pos" | "series" | "sunat" | "catalogo" | "caja">("pos");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Formulario de Cita Pro
  const [appointmentForm, setAppointmentForm] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    businessType: "Tienda de Calzados",
    appointmentDate: "",
    appointmentTime: "10:00 AM",
    notes: "",
  });
  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false);
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  // Calculadora Interactiva de Pérdidas Ocultas
  const [monthlySales, setMonthlySales] = useState<number>(20000);
  const [productCount, setProductCount] = useState<number>(150);

  // Fugas estimadas sin sistema tecnológico
  const inventoryLoss = Math.round(monthlySales * 0.048); // Pares sueltos / stock fantasma
  const receivablesLoss = Math.round(monthlySales * 0.035); // Deudas y fiados olvidados
  const overpurchaseLoss = Math.round(monthlySales * 0.027); // Compras a ciegas de tallas que no rotan
  const totalLoss = inventoryLoss + receivablesLoss + overpurchaseLoss;

  const handleExpressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expressPhone || expressPhone.length < 8) {
      toast.error("Por favor ingresa un número de WhatsApp válido");
      return;
    }
    setExpressLoading(true);
    try {
      await createLeadRequest({
        name: "Prospecto WhatsApp Express",
        phone: expressPhone,
        interestType: "WHATSAPP",
        notes: "Solicitó video demo por WhatsApp desde el Hero de THINK ERP",
        utmSource: "HeroWhatsAppExpress",
      });
      setExpressSubmitted(true);
      toast.success("¡Excelente! Te contactaremos por WhatsApp con el video");
      const msg = encodeURIComponent(
        "¡Hola! Acabo de solicitar la demo y video oficial de THINK ERP para mi negocio. Deseo ver cómo funciona el POS y el control de inventario."
      );
      window.open(`https://wa.me/51912509111?text=${msg}`, "_blank");
    } catch {
      toast.error("Error al registrar solicitud");
    } finally {
      setExpressLoading(false);
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentForm.name || !appointmentForm.phone) {
      toast.error("Por favor ingresa al menos tu nombre y WhatsApp");
      return;
    }
    setAppointmentLoading(true);
    try {
      await createLeadRequest({
        name: appointmentForm.name,
        phone: appointmentForm.phone,
        email: appointmentForm.email || undefined,
        businessName: appointmentForm.businessName || undefined,
        businessType: appointmentForm.businessType,
        appointmentDate: appointmentForm.appointmentDate || undefined,
        appointmentTime: appointmentForm.appointmentTime || undefined,
        interestType: "CITA",
        notes: appointmentForm.notes || "Solicitó demostración personalizada en vivo",
        utmSource: "LandingAppointmentForm",
      });
      setAppointmentSubmitted(true);
      toast.success("¡Cita reservada con éxito! Te contactaremos para confirmar.");
    } catch {
      toast.error("Error al agendar la cita. Por favor intenta de nuevo.");
    } finally {
      setAppointmentLoading(false);
    }
  };

  const scrollToAppointment = () => {
    document.getElementById("agendar-cita")?.scrollIntoView({ behavior: "smooth" });
  };

  const openWhatsAppDirect = (msg: string) => {
    window.open(`https://wa.me/51912509111?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-200 selection:text-indigo-900 overflow-x-hidden">
      {/* 💬 WIDGET DE ASESORÍA Y CHAT EN VIVO DE CAPTURA DE LEADS */}
      <ThinkLiveChatWidget />

      {/* AURA BACKGROUND GRADIENTS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center">
        <div className="absolute top-[-10%] w-[900px] h-[900px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[160px] opacity-35 animate-blob"></div>
        <div className="absolute top-[25%] right-[-10%] w-[700px] h-[700px] bg-sky-300 rounded-full mix-blend-multiply filter blur-[160px] opacity-35 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-[-10%] w-[700px] h-[700px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[160px] opacity-35 animate-blob animation-delay-4000"></div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-slate-900 block leading-tight">
                  THINK
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-md">
                  ERP POS
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 block">
                El Sistema Operativo del Comercio Peruano
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 font-bold text-sm text-slate-600">
            <a href="#sistema-demo" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-indigo-700 font-black">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Simulador en Vivo
            </a>
            <a href="#antes-despues" className="hover:text-indigo-600 transition-colors">
              Antes vs Después
            </a>
            <a href="#modulos" className="hover:text-indigo-600 transition-colors">
              Módulos Clave
            </a>
            <a href="#calculadora" className="hover:text-rose-600 transition-colors flex items-center gap-1 text-rose-600 font-black">
              <Percent className="w-3.5 h-3.5" />
              Calculadora de Fugas
            </a>
            <a href="#precios" className="hover:text-indigo-600 transition-colors">
              Planes & Precios
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              Preguntas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/catalogo"
              title="Ver vitrina y catálogo de clientes en vivo"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all"
            >
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ver Catálogo Web</span>
            </Link>

            <Link
              to="/login"
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors px-3 py-2 hidden md:block"
            >
              Iniciar Sesión
            </Link>

            <button
              onClick={scrollToAppointment}
              className="text-xs sm:text-sm font-black bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 text-white px-5 sm:px-6 py-2.5 rounded-xl hover:shadow-xl hover:shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Demo Gratis</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-24 pb-20">
        {/* HERO SECTION DE MÁXIMA CONVERSIÓN */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-14 flex flex-col items-center text-center">
          {/* Trust Pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-800 text-xs font-black tracking-wide uppercase mb-6 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin-slow" />
            <span>ERP + POS + FACTURACIÓN SUNAT + CURVAS DE CALZADO #1 EN PERÚ</span>
          </motion.div>

          {/* Headline que vende */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-5xl leading-[1.08] mb-6"
          >
            Detén las fugas de dinero en tu tienda.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600">
              Vende en 3 segundos, controla series completas y cuadra tu caja al centavo.
            </span>
          </motion.h1>

          {/* Subheadline directo al dolor */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mb-8 leading-relaxed font-medium"
          >
            El único sistema que entiende la realidad de las zapaterías y el retail peruano:{" "}
            <strong className="text-slate-900 font-black">
              cálculo exacto de series (5 tallas = 6 pares reales), emisión inmediata de boletas SUNAT, catálogo web con pedidos directos a tu WhatsApp
            </strong>{" "}
            y arqueo ciego para que ningún empleado se confunda ni falte un sol.
          </motion.p>

          {/* Píldoras de Propuesta de Valor Clave */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mb-8">
            {[
              { icon: "👠", text: "Series y Curvas Exactas (Cero Pares Huérfanos)" },
              { icon: "⚡", text: "POS Táctil & Lector de Barras en 3s" },
              { icon: "🧾", text: "Boletas y Facturas SUNAT UBL 2.1 Oficiales" },
              { icon: "📲", text: "Catálogo Web Sincronizado con Pedidos a WhatsApp" },
              { icon: "🔒", text: "Cierre Ciego de Turnos & Control de Caja" },
            ].map((pill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 text-xs font-extrabold shadow-2xs hover:border-indigo-300 transition-colors"
              >
                <span>{pill.icon}</span>
                <span>{pill.text}</span>
              </span>
            ))}
          </div>

          {/* CTA DUAL PRINCIPAL */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-lg mb-10">
            <button
              onClick={scrollToAppointment}
              className="w-full sm:w-auto flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Calendar className="w-5 h-5" />
              <span>Solicitar Demostración Gratis</span>
            </button>
            <button
              onClick={() => openWhatsAppDirect("¡Hola! Deseo probar la demo de THINK ERP para mi tienda")}
              className="w-full sm:w-auto px-7 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base transition-all shadow-lg shadow-emerald-600/25 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-5 h-5" />
              <span>WhatsApp Inmediato</span>
            </button>
          </div>

          {/* CAPTURA EXPRESS DE WHATSAPP (EL GANCHO RÁPIDO) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="w-full max-w-xl bg-white p-3.5 sm:p-4 rounded-3xl border-2 border-indigo-100 shadow-2xl shadow-indigo-500/10 mb-12"
          >
            {expressSubmitted ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>¡Listo! Un asesor especialista te escribirá a WhatsApp con el video demostrativo.</span>
              </div>
            ) : (
              <form onSubmit={handleExpressSubmit} className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Ingresa tu WhatsApp (ej: 912345678)"
                    value={expressPhone}
                    onChange={(e) => setExpressPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={expressLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{expressLoading ? "Enviando..." : "Ver Video Demo en 60s"}</span>
                </button>
              </form>
            )}
            <div className="mt-2 text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-3">
              <span>🔒 100% Confidencial</span>
              <span>•</span>
              <span>⚡ Sin compromisos</span>
              <span>•</span>
              <span>💬 Asesoría gratuita adaptada a tu rubro</span>
            </div>
          </motion.div>

          {/* HERO SIMULATOR INTERACTIVO: EL SISTEMA EN ACCIÓN REAL */}
          <div id="sistema-demo" className="w-full max-w-5xl bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden text-left mb-16">
            {/* Simulator Header & Tab Buttons */}
            <div className="bg-slate-900 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-mono text-slate-400 ml-2">THINK ERP 2026 • Simulador Interactivo</span>
                </div>
                <h3 className="text-white font-black text-lg sm:text-xl mt-1">
                  Experimenta el poder del sistema en vivo:
                </h3>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
                {[
                  { id: "pos", label: "⚡ Venta POS 3s", icon: ShoppingBag },
                  { id: "series", label: "👠 Series & Curvas", icon: Layers },
                  { id: "sunat", label: "🧾 SUNAT UBL 2.1", icon: FileText },
                  { id: "catalogo", label: "📱 Catálogo WhatsApp", icon: Store },
                  { id: "caja", label: "🔒 Arqueo Ciego", icon: Shield },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeHeroTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveHeroTab(tab.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulator Body */}
            <div className="p-6 sm:p-8 bg-slate-50/60 min-h-[380px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {activeHeroTab === "pos" && (
                  <motion.div
                    key="tab-pos"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                  >
                    <div className="md:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-extrabold">
                        <Zap className="w-3.5 h-3.5" />
                        Punto de Venta Ultrarrápido para mostrador
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Escanea, cobra con Yape o Efectivo y emite ticket en 3 segundos
                      </h4>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Diseñado para horas punta cuando la tienda está llena. Lee códigos de barra con cualquier pistola USB o la cámara del celular. Soporta pagos mixtos (S/ 50 en efectivo + S/ 45 en Yape) y calcula el vuelto sin error humano.
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2.5">
                          <Barcode className="w-5 h-5 text-indigo-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">Lector de códigos Plug & Play</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2.5">
                          <Printer className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">Ticketera térmica 80mm / 58mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-bold text-slate-400 uppercase text-[10px]">
                        <span>THINK POS • Ticket #0842</span>
                        <span className="text-emerald-600 font-black">VENTA COMPLETADA</span>
                      </div>
                      <div className="space-y-1.5 text-slate-700">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold">1x Stiletto Charol Beige (T.37)</span>
                          <span className="font-bold text-slate-900">S/ 95.00</span>
                        </div>
                        <div className="flex justify-between font-sans">
                          <span className="font-bold">1x Plantilla Confort Ortopédica</span>
                          <span className="font-bold text-slate-900">S/ 25.00</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal Op. Gravada:</span>
                          <span>S/ 101.69</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>I.G.V. (18%):</span>
                          <span>S/ 18.31</span>
                        </div>
                        <div className="flex justify-between text-base font-black text-slate-900 pt-1">
                          <span>TOTAL PAGADO:</span>
                          <span className="text-indigo-600">S/ 120.00</span>
                        </div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 text-[11px] font-sans font-bold flex items-center justify-between">
                        <span>Método: YAPE (Op. 948123)</span>
                        <span className="text-emerald-600 font-black">✓ SUNAT OK</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeHeroTab === "series" && (
                  <motion.div
                    key="tab-series"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                  >
                    <div className="md:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
                        <Layers className="w-3.5 h-3.5 text-amber-700" />
                        El Dolor de Cabeza del Calzado: RESUELTO
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-black text-slate-900">
                        5 tallas NO son 5 pares: THINK calcula exactamente 6 pares por curva
                      </h4>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        En la fabricación y venta de calzado en Perú, la serie 35 a 39 incluye repetición en la talla más demandada (Talla 37 trae 2 pares). Los sistemas genéricos suman 5 pares y te hacen perder dinero. THINK suma los 6 pares reales (S/ 570.00) y descuenta el stock exacto sin dejar pares huérfanos.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold text-amber-900 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>Curva Estándar: T.35(1) + T.36(1) + T.37(2) + T.38(1) + T.39(1) = 6 PARES EXACTOS</span>
                      </div>
                    </div>
                    <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-800 uppercase">STILETTOS CHAROL BEIGE</span>
                        <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">SERIE ACTIVA</span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        Desglose de Tallas en Almacén:
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center font-bold text-xs">
                        <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                          <span className="block text-[10px] text-slate-400">T.35</span>
                          <span className="text-slate-800">1 par</span>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                          <span className="block text-[10px] text-slate-400">T.36</span>
                          <span className="text-slate-800">1 par</span>
                        </div>
                        <div className="p-2 bg-indigo-50 border-2 border-indigo-500 rounded-xl text-indigo-900">
                          <span className="block text-[10px] text-indigo-600 font-black">T.37 (x2)</span>
                          <span className="font-black">2 pares</span>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                          <span className="block text-[10px] text-slate-400">T.38</span>
                          <span className="text-slate-800">1 par</span>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                          <span className="block text-[10px] text-slate-400">T.39</span>
                          <span className="text-slate-800">1 par</span>
                        </div>
                      </div>
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Serie Calculada</span>
                          <span className="font-black text-sm text-emerald-400">6 Pares (S/ 95 c/u)</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">Precio Serie</span>
                          <span className="font-black text-lg text-white">S/ 570.00</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeHeroTab === "sunat" && (
                  <motion.div
                    key="tab-sunat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                  >
                    <div className="md:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold">
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                        Emisión Electrónica Oficial UBL 2.1
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Boletas y Facturas automáticas conectadas con SUNAT
                      </h4>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Compatible con CCOFACT PRO y NubeFacT. Emite comprobantes electrónicos con CDR verde instantáneo, código QR tributario y firma digital SHA-256. Duerme tranquilo sabiendo que tu negocio cumple al 100% con la normativa fiscal sin depender de contadores para cada venta.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Boletas de Venta B001
                        </span>
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Facturas F001 con RUC
                        </span>
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Notas de Crédito y Débito
                        </span>
                      </div>
                    </div>
                    <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                            S
                          </div>
                          <div>
                            <span className="block text-xs font-black text-slate-900">BOLETA ELECTRÓNICA</span>
                            <span className="text-[10px] text-slate-500 font-mono">B001-0004921</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          ACEPTADA SUNAT
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
                        <div className="flex justify-between text-slate-500">
                          <span>Hash SHA-256:</span>
                          <span className="text-slate-800 font-bold truncate max-w-[140px]">7a9f2...c83b</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Código CDR:</span>
                          <span className="text-emerald-700 font-bold">0 (Aprobado sin obs.)</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Validación RUC/DNI:</span>
                          <span className="text-slate-800 font-bold">DNI 72819201</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-bold text-slate-600">Descargas automáticas:</span>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black cursor-pointer">PDF</span>
                          <span className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black cursor-pointer">XML</span>
                          <span className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black cursor-pointer">CDR</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeHeroTab === "catalogo" && (
                  <motion.div
                    key="tab-catalogo"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                  >
                    <div className="md:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        Tu Tienda Virtual Operando 24/7 sin Comisiones
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Tus clientes compran por WhatsApp con stock y fotos reales
                      </h4>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Cada producto que ingresas al ERP se publica automáticamente en tu Catálogo Digital Web. Los clientes pueden filtrar por marca, categoría, color, tono o talla, ver fotos grandes en alta resolución y armar su pedido que llega directo a tu WhatsApp listo para cobrar.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <Link
                          to="/catalogo"
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
                        >
                          <span>Ver Catálogo en Vivo</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <span className="text-xs text-slate-500 font-bold">
                          ✓ Sincronizado en tiempo real con almacén
                        </span>
                      </div>
                    </div>
                    <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-3">
                      <div className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center gap-3 shadow-md">
                        <Phone className="w-6 h-6 shrink-0 fill-white" />
                        <div className="text-xs">
                          <span className="block font-black">Nuevo Pedido de WhatsApp:</span>
                          <span className="text-emerald-100 text-[11px]">"Hola, vi este modelo en su catálogo digital..."</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-slate-800">Resumen del Pedido del Cliente:</div>
                        <div className="text-[11px] text-slate-600 space-y-1">
                          <div>• 1x Stiletto Xiomara Charol Beige (Talla 37)</div>
                          <div>• Dirección: Av. Larco 450, Trujillo</div>
                          <div>• Método Preferido: Pago contra entrega (Yape)</div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold">
                          <span className="text-slate-500">Monto a cobrar:</span>
                          <span className="text-indigo-600 font-black text-sm">S/ 95.00</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeHeroTab === "caja" && (
                  <motion.div
                    key="tab-caja"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                  >
                    <div className="md:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-extrabold">
                        <Shield className="w-3.5 h-3.5 text-purple-600" />
                        Seguridad Total contra Fugas y Robos Hormiga
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Arqueo Ciego por Turnos: El cajero no ve el saldo hasta contar el dinero
                      </h4>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        El método probado por las grandes cadenas: al terminar el turno, el cajero debe declarar cuánto dinero físico y comprobantes de Yape/Plin tiene en mano ANTES de que el sistema le revele el monto esperado. Si falta un sol, el reporte gerencial te avisa al instante a tu celular.
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold text-slate-700">
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Separación Efectivo / Yape</span>
                        </div>
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Control de Gastos Menores</span>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-bold uppercase text-[10px] text-slate-400">
                        <span>CIERRE DE TURNO: MAÑANA</span>
                        <span className="text-indigo-600">TURNO #014</span>
                      </div>
                      <div className="space-y-1.5 text-slate-700 font-sans">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Saldo Inicial de Caja:</span>
                          <span className="font-bold">S/ 150.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ventas en Efectivo:</span>
                          <span className="font-bold text-emerald-600">+ S/ 1,420.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ventas Digitales (Yape/Plin):</span>
                          <span className="font-bold text-indigo-600">+ S/ 980.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Salidas de Dinero / Gastos:</span>
                          <span className="font-bold text-rose-600">- S/ 65.00</span>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 font-sans">
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                          <span>Dinero Físico Declarado:</span>
                          <span className="text-emerald-700 font-black">S/ 1,505.00</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-emerald-800 font-semibold mt-1">
                          <span>Diferencia de Caja:</span>
                          <span className="font-black text-emerald-600">S/ 0.00 (CUADRADO PERFECTO)</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* TRUST COUNTERS */}
          <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-indigo-600">+500</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-0.5">Tiendas Formalizadas</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">3 seg</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-0.5">Velocidad POS Mostrador</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-purple-600">0 pares</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-0.5">Huérfanos en Series</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-sky-600">100%</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-0.5">Conforme con SUNAT</div>
            </div>
          </div>
        </section>

        {/* COMPARATIVA IMPACTANTE: ANTES VS DESPUÉS */}
        <section id="antes-despues" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 inline-block mb-3">
              La Verdadera Diferencia Comercial
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
              ¿Por qué los negocios fracasan sin tecnología?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium max-w-2xl mx-auto">
              No pierdes dinero por vender poco; pierdes dinero porque tu stock no cuadra, tus clientes esperan en la fila y tus empleados no tienen herramientas ágiles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* EL ANTES */}
            <div className="bg-rose-50/70 border-2 border-rose-200 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-rose-500/20">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700">El Caos Habitual</span>
                  <h3 className="text-2xl font-black text-rose-950">Sin Sistema o con Cuadernos</h3>
                </div>
              </div>

              <ul className="space-y-4 text-sm font-semibold text-rose-900/90">
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Pares Huérfanos en Almacén:</strong> Te quedan tallas 35 o 39 tiradas que nadie compra porque no supiste vender la serie completa con su curva real.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Descuadres Diarios en Caja:</strong> Al cerrar el día faltan S/ 50 o S/ 100 y nadie sabe si fue por vuelto mal entregado o robo hormiga.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Colas y Clientes que se van:</strong> Demoras 4 minutos llenando una boleta a mano mientras el cliente se desespera y abandona la compra.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Ceguera Financiera Total:</strong> Trabajas de lunes a domingo 14 horas pero a fin de mes no sabes exactamente cuánto ganaste ni qué productos te dan margen.
                  </span>
                </li>
              </ul>
            </div>

            {/* EL DESPUÉS */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-[2.5rem] p-8 sm:p-10 border-2 border-indigo-400 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">La Nueva Era</span>
                  <h3 className="text-2xl font-black text-white">Con THINK ERP & POS</h3>
                </div>
              </div>

              <ul className="space-y-4 text-sm font-semibold text-slate-200">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Series y Curvas sin Pérdidas:</strong> Vende series completas (6 pares exactos) o pares individuales con un solo clic. El stock se actualiza en tiempo real.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Arqueo Ciego al Centavo:</strong> El empleado declara su dinero físico y el sistema genera el balance perfecto de efectivo, Yape, Plin y tarjetas.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cobro en 3 Segundos:</strong> Escaneas con código de barras y la boleta SUNAT se imprime sola en tu ticketera térmica. Cero colas.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Control en tu Celular desde Cualquier Lugar:</strong> Mira las ventas, utilidades y nivel de stock de tus tiendas en tiempo real sin estar presente.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CALCULADORA INTERACTIVA DE PÉRDIDAS OCULTAS */}
        <section id="calculadora" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[3rem] p-8 md:p-14 shadow-2xl border-4 border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wide mb-4">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Calculadora Financiera de Fugas
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
                ¿Cuánto dinero estás perdiendo cada mes sin darte cuenta?
              </h2>
              <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
                Descubre el impacto oculto del descontrol de inventario, stock fantasma y deudas no cobradas en tiendas de retail y calzado.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Tus Ventas Mensuales Estimadas:
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      S/ {monthlySales.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="150000"
                    step="1000"
                    value={monthlySales}
                    onChange={(e) => setMonthlySales(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                    <span>S/ 5,000</span>
                    <span>S/ 75,000</span>
                    <span>S/ 150,000+</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Modelos o Artículos en Stock:
                    </span>
                    <span className="text-2xl font-black text-sky-400">
                      {productCount} modelos
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={productCount}
                    onChange={(e) => setProductCount(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                    <span>20 modelos</span>
                    <span>500 modelos</span>
                    <span>1,000+ modelos</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl">
                    <div className="text-[10px] font-bold uppercase text-rose-300">Pares y Stock Fantasma</div>
                    <div className="text-xl font-black text-rose-400 mt-1">S/ {inventoryLoss.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Tallas sueltas que no rotan</div>
                  </div>
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
                    <div className="text-[10px] font-bold uppercase text-amber-300">Créditos Olvidados</div>
                    <div className="text-xl font-black text-amber-400 mt-1">S/ {receivablesLoss.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Fiados que nunca cobraste</div>
                  </div>
                  <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-2xl">
                    <div className="text-[10px] font-bold uppercase text-purple-300">Compras a Ciegas</div>
                    <div className="text-xl font-black text-purple-400 mt-1">S/ {overpurchaseLoss.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Sobre-stock innecesario</div>
                  </div>
                </div>
              </div>

              {/* Resultado del impacto */}
              <div className="lg:col-span-5 bg-gradient-to-b from-rose-950/90 to-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-center relative shadow-2xl">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-rose-400 block mb-2">
                    Fuga Mensual Estimada en tu Negocio
                  </span>
                  <div className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">
                    S/ {totalLoss.toLocaleString()}
                    <span className="text-sm text-rose-300 block font-bold mt-1">/ mes botados a la basura</span>
                  </div>
                  <div className="text-xs font-bold text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
                    Eso representa <strong className="text-rose-400 text-sm">S/ {(totalLoss * 12).toLocaleString()} al año</strong> que podrías estar disfrutando o reinvirtiendo en mercadería rentable.
                  </div>
                </div>

                <button
                  onClick={scrollToAppointment}
                  className="w-full py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-rose-600/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Detener Estas Pérdidas con THINK</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 🎬 VIDEO TOUR OFICIAL & SIMULADOR EN VIVO */}
        <ThinkSystemShowcase />

        {/* MÓDULOS ERP DISEÑADOS PARA VENDER MÁS */}
        <section id="modulos" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black tracking-wide uppercase mb-4">
              <Zap className="w-4 h-4 text-indigo-600" />
              Módulos Nivel Pro sin Complicaciones
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-4">
              Todo lo que tu tienda necesita. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-600">
                Operativo desde tu celular, tablet o laptop.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
              Sin instalaciones complejas ni servidores costosos. Acceso seguro en la nube con respaldo diario.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Item 1: POS Táctil */}
            <div className="md:col-span-8 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden group hover:border-indigo-300 transition-all">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-sky-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/25">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                    Punto de Venta (POS) Táctil Ultra-Rápido
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 font-medium mb-6 leading-relaxed">
                    Atiende a tus clientes en segundos. Lee códigos de barra con pistola o cámara, asigna comisiones a tus vendedores y permite pagos mixtos (Yape + Efectivo + Tarjeta).
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm font-bold text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Compatible con cualquier lector de código de barras USB/Bluetooth.
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Impresión automática de tickets en 80mm y 58mm.
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Comisiones calculadas por asesor o vendedora.
                    </li>
                  </ul>
                </div>
                <div className="w-full lg:w-72 bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between font-mono text-xs">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Venta Mostrador</span>
                    <span className="text-xs font-black text-emerald-400">S/ 190.00</span>
                  </div>
                  <div className="py-4 space-y-2">
                    <div className="flex justify-between text-slate-300 font-sans">
                      <span>Stiletto Taco 3 Charol (T.37)</span>
                      <span>S/ 95.00</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-sans">
                      <span>Sandalia Plataforma (T.36)</span>
                      <span>S/ 95.00</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                    <span>Cobro: YAPE</span>
                    <span className="text-emerald-400 font-bold">✓ Ticket #0843</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Item 2: Motor de Curvas */}
            <div className="md:col-span-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center text-indigo-300 mb-6">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                Curvas de Series & Tallas
              </h3>
              <p className="text-sm text-slate-300 font-medium mb-5 leading-relaxed">
                Gestión nativa de series para calzado y confección. Agrupa tallas de la 34 a la 39 con repetición en tallas centrales sin descuadrar inventario.
              </p>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-xs space-y-2">
                <div className="text-indigo-200 font-bold">Curva de Calzado Estándar (35-39):</div>
                <div className="flex gap-1.5 flex-wrap pt-1 font-mono font-bold">
                  <span className="px-2 py-0.5 bg-indigo-600/80 rounded">35(1)</span>
                  <span className="px-2 py-0.5 bg-indigo-600/80 rounded">36(1)</span>
                  <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 rounded font-black">37(2)</span>
                  <span className="px-2 py-0.5 bg-indigo-600/80 rounded">38(1)</span>
                  <span className="px-2 py-0.5 bg-indigo-600/80 rounded">39(1)</span>
                </div>
                <div className="text-[11px] text-emerald-300 font-bold pt-1">
                  ✓ Total Serie = 6 Pares Calculados
                </div>
              </div>
            </div>

            {/* Bento Item 3: Facturación SUNAT */}
            <div className="md:col-span-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8 sm:p-10 rounded-[2.5rem] shadow-lg">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-blue-600/30">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                Facturación SUNAT UBL 2.1 Oficial
              </h3>
              <p className="text-sm sm:text-base text-slate-700 font-medium mb-6 leading-relaxed">
                Conexión directa mediante CCOFACT PRO y NubeFacT. Emite Boletas F001/B001, Facturas con consulta automática de RUC y Notas de Crédito con CDR verde en 1 segundo.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 bg-blue-100/80 px-3.5 py-2 rounded-xl border border-blue-300 w-fit">
                <Shield className="w-4 h-4 text-blue-700" />
                <span>100% Homologado con SUNAT Perú</span>
              </div>
            </div>

            {/* Bento Item 4: Catálogo Web & QR */}
            <div className="md:col-span-7 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-500/25">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                Catálogo Web con Pedidos a WhatsApp
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-medium mb-4 leading-relaxed">
                Tus clientes no tienen que llamarte para saber qué tienes en stock. Comparte tu enlace de catálogo con fotos en HD, filtros por talla y color, y recibe los pedidos listos en tu WhatsApp.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Sin Comisiones por Venta</div>
                  <div className="text-lg font-black text-emerald-950 mt-1">0% Comisiones</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">Tu margen se queda contigo</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-indigo-800">Sincronización Total</div>
                  <div className="text-lg font-black text-indigo-950 mt-1">Stock en Vivo</div>
                  <div className="text-[11px] text-indigo-700 mt-0.5">Si vendes en tienda, se descuenta</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FORMULARIO PRO DE AGENDAMIENTO DE CITAS / DEMO */}
        <section id="agendar-cita" className="max-w-5xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <div className="bg-white rounded-[3rem] p-8 sm:p-14 border-2 border-indigo-100 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-3xl -z-0"></div>

            <div className="max-w-2xl mx-auto text-center mb-10 relative z-10">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1.5 mb-4">
                <Calendar className="w-3.5 h-3.5" />
                Demostración 1 a 1 Gratuita por WhatsApp / Zoom
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
                Separa tu Cita Personalizada con un Experto
              </h2>
              <p className="text-slate-600 text-sm sm:text-base font-medium">
                Te mostraremos en vivo cómo funciona THINK adaptado exactamente a tu tipo de tienda (calzado, ropa, minimarket o distribuidora). Sin costos ni compromisos.
              </p>
            </div>

            {appointmentSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4 relative z-10"
              >
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-emerald-950">¡Cita Registrada con Éxito!</h3>
                <p className="text-xs sm:text-sm font-semibold text-emerald-800 leading-relaxed">
                  Gracias <strong>{appointmentForm.name}</strong>. Hemos registrado tu solicitud para{" "}
                  <strong>{appointmentForm.businessName || "tu tienda"}</strong> el día{" "}
                  <strong>{appointmentForm.appointmentDate || "próxima fecha"}</strong> a las{" "}
                  <strong>{appointmentForm.appointmentTime}</strong>. Te contactaremos a tu WhatsApp ({appointmentForm.phone}) para confirmar el enlace.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      openWhatsAppDirect(
                        `¡Hola! Agendé mi demo gratuita de THINK ERP para ${appointmentForm.businessName || "mi negocio"} el ${appointmentForm.appointmentDate || "día programado"}`
                      )
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Confirmar por WhatsApp Inmediato</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleAppointmentSubmit} className="max-w-2xl mx-auto space-y-4 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                      Tu Nombre Completo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Diana Salazar"
                      value={appointmentForm.name}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                      Número de WhatsApp *
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej: 912345678"
                      value={appointmentForm.phone}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                      Nombre de tu Tienda o Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Calzados Diana / Boutique Glam"
                      value={appointmentForm.businessName}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, businessName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                      Giro o Rubro Comercial
                    </label>
                    <select
                      value={appointmentForm.businessType}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, businessType: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Tienda de Calzados">Tienda de Calzados / Zapatos</option>
                      <option value="Boutique de Ropa">Boutique de Ropa / Moda</option>
                      <option value="Minimarket / Bodega">Minimarket / Abarrotes</option>
                      <option value="Ferretería">Ferretería / Repuestos</option>
                      <option value="Distribuidora Mayorista">Distribuidora / Mayorista</option>
                      <option value="Otro Negocio">Otro Negocio</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                      Fecha Preferida de la Cita
                    </label>
                    <input
                      type="date"
                      value={appointmentForm.appointmentDate}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                      Horario más Cómodo
                    </label>
                    <select
                      value={appointmentForm.appointmentTime}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="09:00 AM">09:00 AM (Mañana)</option>
                      <option value="11:00 AM">11:00 AM (Mañana)</option>
                      <option value="03:00 PM">03:00 PM (Tarde)</option>
                      <option value="05:00 PM">05:00 PM (Tarde)</option>
                      <option value="07:00 PM">07:00 PM (Noche)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                    ¿Qué te gustaría resolver principalmente en tu negocio? (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Quiero controlar las series de calzado para que no me queden pares sueltos y cuadrar la caja..."
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={appointmentLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-2xl font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-5 h-5" />
                  <span>{appointmentLoading ? "Registrando Cita..." : "Confirmar Mi Demostración Gratuita"}</span>
                </button>
              </form>
            )}
          </div>
        </section>

        {/* PREGUNTAS FRECUENTES (FAQ) DE ALTA CONVERSIÓN */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
          <div className="text-center mb-12">
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mb-3">
              Dudas Resueltas
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Preguntas Frecuentes de Dueños de Tiendas
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              Todo lo que necesitas saber antes de dar el paso con THINK ERP.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              {
                q: "¿Cómo funciona el cálculo de series en calzado (5 tallas vs 6 pares)?",
                a: "El calzado en Perú se vende por series o curvas donde la talla de mayor rotación (generalmente la talla 37) viene duplicada. Nuestro sistema calcula automáticamente los 6 pares de la serie completa (6 x precio unitario), genera los 6 registros de stock correctos y descuenta la cantidad exacta para que nunca más te queden pares huérfanos.",
              },
              {
                q: "¿Funciona con mi impresora térmica de tickets y mi lector de código de barras?",
                a: "Sí, 100%. THINK es compatible con cualquier ticketera térmica estándar (80mm y 58mm) conectada por USB, Bluetooth o Red, así como cualquier pistola lectora de código de barras tipo teclado Plug & Play.",
              },
              {
                q: "¿Qué pasa si no tengo RUC o estoy en el RUS?",
                a: "Puedes empezar emitiendo Notas de Venta internas o tickets de control para tu caja. Y cuando decidas formalizarte o si ya tienes RUC 10 o 20, activas el módulo de Facturación SUNAT con Boletas y Facturas electrónicas oficiales.",
              },
              {
                q: "¿Puedo revisar las ventas desde mi celular si estoy fuera de la tienda?",
                a: "Por supuesto. Al estar en la nube, puedes abrir THINK desde tu celular, tablet o laptop en cualquier parte del mundo y ver en tiempo real cuánto se vendió, qué cajero está de turno y qué productos se están agotando.",
              },
              {
                q: "¿Cómo evito que los empleados me roben con el Arqueo Ciego?",
                a: "Con el Arqueo Ciego, el cajero debe ingresar físicamente cuánto dinero contó al final del turno. El sistema no le muestra el monto esperado hasta que envía su declaración, impidiendo que esconda diferencias o descuadres.",
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    <span className="text-base pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-indigo-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* PLANES Y PRECIOS CLAROS */}
        <section id="precios" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-3">
              Inversión Transparente
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Planes Diseñados para Multiplicar tu Rentabilidad
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium max-w-xl mx-auto">
              Sin sorpresas ni contratos abusivos. Asesoría de inicio incluida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plan 1 */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg flex flex-col justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Emprendedor
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Plan Inicial</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                  Para tiendas pequeñas o negocios que inician su formalización comercial.
                </p>
                <div className="mb-6">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">A Convenir</div>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">✓ Planes accesibles según tu rubro</span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-700 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Punto de Venta (POS) Táctil</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Control de Stock e Inventario</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Arqueos y Cierres de Turno</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Reportes de Ventas en PDF y Excel</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => openWhatsAppDirect("Hola THINK, deseo cotizar el Plan Inicial Emprendedor para mi tienda")}
                className="w-full py-3.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                <span>Cotizar Plan Emprendedor</span>
              </button>
            </div>

            {/* Plan 2: Estrella */}
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-8 rounded-[2.5rem] border-2 border-indigo-400 shadow-2xl flex flex-col justify-between relative transform md:-translate-y-4">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                ⭐ Más Elegido por Negocios
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-2 pt-2">
                  Negocio Pro
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Comercial & Calzado</h3>
                <p className="text-xs text-slate-300 mb-6 font-medium">
                  Incluye el motor exclusivo de Series de Calzado (Curvas 35-39), Facturación SUNAT y Catálogo Web con WhatsApp.
                </p>
                <div className="mb-6">
                  <div className="text-4xl font-black text-white tracking-tight">Personalizado</div>
                  <span className="text-xs font-bold text-amber-300 block mt-1">✓ Asesoría personalizada y demo guiada</span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-200 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Todo lo del Plan Inicial</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Motor de Curvas de Calzado (5 tallas = 6 pares)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Facturación Electrónica SUNAT (UBL 2.1)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Catálogo Web con Pedidos a WhatsApp</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Soporte Prioritario 24/7 por WhatsApp</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => openWhatsAppDirect("Hola THINK, deseo cotizar el Plan Comercial & Calzado Pro para mi negocio")}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/30 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Cotizar por WhatsApp / Agendar Demo</span>
              </button>
            </div>

            {/* Plan 3 */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg flex flex-col justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Corporativo
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Multi-Sede & Almacenes</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                  Para empresas con múltiples tiendas físicas, almacén central y venta mayorista.
                </p>
                <div className="mb-6">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">A Medida</div>
                  <span className="text-xs font-bold text-indigo-600 block mt-1">✓ Despliegue empresarial y migración de datos</span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-700 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Sucursales y Almacenes Ilimitados</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Traslados de Mercadería entre Tiendas</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Roles de Trabajador y Permisos Finos</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Asesoría y Migración Gratuita de Datos</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => openWhatsAppDirect("Hola THINK, deseo una propuesta Corporativa Multi-Sede para mi empresa")}
                className="w-full py-3.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                <span>Solicitar Propuesta Multi-Sede</span>
              </button>
            </div>
          </div>
        </section>

        {/* GARANTÍA DE SATISFACCIÓN */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
              <Shield className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mb-2">
                Garantía Blindada de 30 Días "Cero Riesgo"
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-emerald-800 leading-relaxed">
                Prueba THINK en tu tienda. Si en los primeros 30 días no sientes que duplicaste el orden y detuviste las fugas de dinero en tu negocio, te devolvemos el 100% de tu dinero sin preguntas. Así de seguros estamos del impacto de nuestro sistema.
              </p>
            </div>
          </div>
        </section>

        {/* RESPALDO CORPORACIÓN CCOPLEX */}
        <section id="about" className="py-20 relative bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-3">
                  Respaldo Corporativo
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6">
                  Desarrollado con Orgullo por <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
                    Corporación Ccoplex
                  </span>
                </h2>
                <p className="text-slate-300 text-base leading-relaxed mb-6 font-medium">
                  THINK nació de una necesidad real: comerciantes y zapateros peruanos que trabajaban 14 horas al día pero no veían las ganancias por falta de control tecnológico. Nuestra misión es darte las mismas herramientas de las grandes cadenas a una fracción del costo.
                </p>
                <div className="flex gap-8">
                  <div>
                    <div className="text-3xl font-black text-white">99.9%</div>
                    <div className="text-xs text-slate-400 uppercase font-bold">Uptime Servidores</div>
                  </div>
                  <div className="w-px h-12 bg-white/10"></div>
                  <div>
                    <div className="text-3xl font-black text-white">100%</div>
                    <div className="text-xs text-slate-400 uppercase font-bold">Hecho en Perú</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase">Línea Directa Gerencia</div>
                    <div className="text-base font-black text-white">+51 912 509 111</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase">Correo de Soporte</div>
                    <div className="text-base font-black text-white">soporte-think@ccoplex.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase">Razón Social</div>
                    <div className="text-base font-black text-white">Corporación Ccoplex S.A.C.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
              T
            </div>
            <span className="text-white font-black text-lg">THINK</span>
            <span className="text-slate-500">• Corporación Ccoplex S.A.C.</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} THINK ERP. Todos los derechos reservados.
          </div>
          <div className="flex gap-4 text-slate-400">
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#precios" className="hover:text-white transition-colors">Planes</a>
            <Link to="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
