import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import VeazFloatingModal from "../components/veaz/VeazFloatingModal";
import { VeazCrownIcon } from "../components/veaz/VeazLogo";
import ThinkLiveChatWidget from "../components/landing/ThinkLiveChatWidget";
import { createLeadRequest } from "../services/lead.api";
import { toast } from "react-hot-toast";

export default function LandingPage() {
  useEffect(() => {
    document.title = "THINK | Sistema de Gestión, POS e Inventario Inteligente para Negocios";
  }, []);

  // WhatsApp Express Capture
  const [expressPhone, setExpressPhone] = useState("");
  const [expressSubmitted, setExpressSubmitted] = useState(false);
  const [expressLoading, setExpressLoading] = useState(false);

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
  const [monthlySales, setMonthlySales] = useState<number>(18000);
  const [productCount, setProductCount] = useState<number>(120);

  // Cálculos de pérdidas estimadas sin sistema:
  // - Pérdida por descontrol de inventario / stock fantasma: ~4.5% de ventas
  // - Pérdida por cuentas por cobrar olvidadas / no cobradas: ~3.8% de ventas
  // - Pérdida por compras excesivas o ciegas: ~2.5% de ventas
  const inventoryLoss = Math.round(monthlySales * 0.045);
  const receivablesLoss = Math.round(monthlySales * 0.038);
  const overpurchaseLoss = Math.round(monthlySales * 0.025);
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
        notes: "Solicitó video demo por WhatsApp desde el Hero de la Landing Page",
        utmSource: "HeroWhatsAppExpress",
      });
      setExpressSubmitted(true);
      toast.success("¡Excelente! Te contactaremos por WhatsApp con el video");
      // Abrir WhatsApp con mensaje preconfigurado opcional
      const msg = encodeURIComponent("¡Hola! Solicité el video demostrativo de THINK para mi negocio.");
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
        notes: appointmentForm.notes || "Solicitó demostración personalizada desde formulario de citas",
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

  return (
    <div className="min-h-screen bg-[#fafcff] text-slate-900 font-sans selection:bg-indigo-200 selection:text-indigo-900 overflow-x-hidden">
      {/* 👑 MODAL FLOTANTE AUTOMÁTICO VEAZ ESTILEZA */}
      <VeazFloatingModal />

      {/* 💬 WIDGET DE ASESORÍA Y CHAT EN VIVO DE CAPTURA DE LEADS */}
      <ThinkLiveChatWidget />

      {/* AURA BACKGROUND GRADIENTS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center">
        <div className="absolute top-[-10%] w-[900px] h-[900px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[160px] opacity-40 animate-blob"></div>
        <div className="absolute top-[25%] right-[-10%] w-[700px] h-[700px] bg-sky-300 rounded-full mix-blend-multiply filter blur-[160px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-[-10%] w-[700px] h-[700px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[160px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              T
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-slate-900 block leading-tight">
                THINK
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">
                Finanzas & Ventas Pro
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 font-bold text-sm text-slate-600">
            <a href="#rubros" className="hover:text-indigo-600 transition-colors">
              Rubros
            </a>
            <a href="#modulos" className="hover:text-indigo-600 transition-colors">
              Módulos ERP
            </a>
            <a href="#calculadora" className="hover:text-indigo-600 transition-colors flex items-center gap-1 text-rose-600 font-black">
              <Percent className="w-3.5 h-3.5" />
              Calculadora
            </a>
            <a href="#precios" className="hover:text-indigo-600 transition-colors">
              Planes
            </a>
            <a href="#testimonios" className="hover:text-indigo-600 transition-colors">
              Casos de Éxito
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/veaz-estileza"
              title="Showroom oficial y boutique de calzados desarrollada y gestionada con THINK por Corporación Ccoplex"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border border-amber-500/35 text-amber-900 hover:bg-amber-500/20 text-xs font-bold tracking-wide transition-all shadow-2xs group"
            >
              <VeazCrownIcon size={14} />
              <span className="font-black text-amber-800">Boutique Oficial: VEAZ ESTILEZA</span>
              <Sparkles className="w-3 h-3 text-amber-500 group-hover:rotate-12 transition-transform" />
            </Link>

            <Link
              to="/login"
              className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors px-3 py-2 hidden sm:block"
            >
              Ingresar
            </Link>

            <button
              onClick={scrollToAppointment}
              className="text-xs sm:text-sm font-black bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 text-white px-5 sm:px-6 py-2.5 rounded-full hover:shadow-xl hover:shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Separar Cita / Demo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-28 pb-20">
        {/* HERO SECTION DE ALTO IMPACTO MULTIRUBRO */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-black tracking-wide uppercase mb-6 shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Sistema ERP, POS & Finanzas Multirubro de Corporación Ccoplex</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 max-w-5xl leading-[1.05] mb-6"
          >
            Un Solo Sistema. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500">
              Para Todos tus Rubros.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mb-8 leading-relaxed font-medium"
          >
            Potencia tu negocio sin importar lo que vendas: <strong>Ferreterías, Bodegas, Minimarkets, Tiendas de Ropa, Calzado, Electrodomésticos y Farmacias</strong>. Ventas en 3 segundos con POS táctil, Kardex valorado multialmacén, Tesorería blindada y control de deudas con WhatsApp.
          </motion.p>

          {/* RUBROS COMPATIBLES AL 100% */}
          <div id="rubros" className="w-full max-w-5xl mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Adaptado con precisión a la operativa de cada industria:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {[
                { name: "Ferreterías & Materiales", icon: "🔨", desc: "Metros, Kilos, Cajas y Escáner" },
                { name: "Bodegas & Minimarkets", icon: "🛒", desc: "Venta rápida, Yape/Plin, Stock Mínimo" },
                { name: "Tiendas de Ropa & Moda", icon: "👗", desc: "Tallas, Colores, Ofertas con Temporizador" },
                { name: "Zapaterías & Calzado", icon: "👠", desc: "Curvas de Series (34-39), Tacos y Pares" },
                { name: "Electrodomésticos & Retail", icon: "📺", desc: "Números de Serie, Garantías, Comisiones" },
                { name: "Farmacias & Boticas", icon: "💊", desc: "Blísters, Cajas, Lotes y Vencimientos" },
                { name: "Distribuidoras & Mayoristas", icon: "📦", desc: "Paquetes, Fardos, Sacos y Docenas" },
              ].map((rubro) => (
                <div
                  key={rubro.name}
                  className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all group"
                >
                  <span className="text-base">{rubro.icon}</span>
                  <div className="text-left">
                    <span className="block text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {rubro.name}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      {rubro.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CAPTURA EXPRESS DE WHATSAPP (EL GANCHO RÁPIDO) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="w-full max-w-xl bg-white p-3 sm:p-3.5 rounded-3xl border-2 border-indigo-100 shadow-2xl shadow-indigo-500/10 mb-8"
          >
            {expressSubmitted ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>¡Listo! Un especialista te escribirá por WhatsApp con el video demostrativo.</span>
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
                  <span>Ver Video Demo en 60s</span>
                </button>
              </form>
            )}
            <div className="mt-2 text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-3">
              <span>🔒 100% Confidencial</span>
              <span>•</span>
              <span>⚡ Sin compromisos ni spam</span>
              <span>•</span>
              <span>💬 Demostración en vivo adaptada a tu rubro</span>
            </div>
          </motion.div>

          {/* CASO REAL CORPORACIÓN CCOPLEX */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full flex justify-center mb-8"
          >
            <div className="w-full max-w-xl p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <VeazCrownIcon size={22} />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
                    Línea Oficial de Corporación Ccoplex
                  </span>
                  <span className="block font-black text-white text-base sm:text-lg">
                    VEAZ ESTILEZA Showroom
                  </span>
                  <span className="block text-xs text-slate-400">
                    Boutique de calzados exclusivos operando en tiempo real con THINK ERP
                  </span>
                </div>
              </div>
              <Link
                to="/veaz-estileza"
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0"
              >
                <span>Visitar Showroom Oficial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* DUAL ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
            <button
              onClick={scrollToAppointment}
              className="w-full sm:w-auto flex-1 px-8 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-full font-black text-base transition-all shadow-xl shadow-slate-900/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Calendar className="w-5 h-5" />
              <span>Separar Cita con Asesor</span>
            </button>
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 bg-white/90 backdrop-blur-md border-2 border-slate-200 text-slate-800 hover:border-indigo-400 rounded-full font-bold text-base transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              Probar Gratis
            </Link>
          </div>

          {/* TRUST BADGES */}
          <div className="mt-14 pt-8 border-t border-slate-200/80 w-full max-w-4xl flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-slate-500 text-xs font-black uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>+500 Negocios Registrados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              <span>Multirubro Universal 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              <span>Boletas SUNAT Automáticas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>Soporte Humano 24/7</span>
            </div>
          </div>
        </section>

        {/* CALCULADORA INTERACTIVA DE PÉRDIDAS OCULTAS (THE HOOK) */}
        <section id="calculadora" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-24">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[3rem] p-8 md:p-14 shadow-2xl border-4 border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wide mb-4">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Diagnóstico de Fugas Financieras
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
                ¿Cuánto dinero estás perdiendo cada mes sin saberlo?
              </h2>
              <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
                Estudios comerciales demuestran que los negocios que usan cuadernos o sistemas obsoletos pierden entre el <strong>8% y el 14% de sus ingresos</strong> por falta de control de inventario, stock fantasma y deudas no cobradas.
              </p>
            </div>

            {/* Sliders interactivos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Tus Ventas Mensuales Aproximadas:
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      S/ {monthlySales.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3000"
                    max="100000"
                    step="1000"
                    value={monthlySales}
                    onChange={(e) => setMonthlySales(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                    <span>S/ 3,000</span>
                    <span>S/ 50,000</span>
                    <span>S/ 100,000+</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Modelos o Productos en Almacén:
                    </span>
                    <span className="text-xl font-black text-sky-400">
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
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                    <span>20 modelos</span>
                    <span>500 modelos</span>
                    <span>1,000+ modelos</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <div className="text-[10px] font-bold uppercase text-rose-300">Descontrol de Stock</div>
                    <div className="text-lg font-black text-rose-400 mt-1">S/ {inventoryLoss.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Mercadería no registrada o perdida</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="text-[10px] font-bold uppercase text-amber-300">Deudas Olvidadas</div>
                    <div className="text-lg font-black text-amber-400 mt-1">S/ {receivablesLoss.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Créditos de clientes no cobrados</div>
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="text-[10px] font-bold uppercase text-purple-300">Compras a Ciegas</div>
                    <div className="text-lg font-black text-purple-400 mt-1">S/ {overpurchaseLoss.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Sobre-stock de tallas que no rotan</div>
                  </div>
                </div>
              </div>

              {/* Resultado del impacto */}
              <div className="lg:col-span-5 bg-gradient-to-b from-rose-950/80 to-slate-900 border-2 border-rose-500/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-center relative">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-rose-400 block mb-2">
                    Pérdida Mensual Estimada
                  </span>
                  <div className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">
                    S/ {totalLoss.toLocaleString()}
                    <span className="text-sm text-rose-300 block font-bold">/ cada mes</span>
                  </div>
                  <div className="text-xs font-bold text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
                    Eso equivale a <strong className="text-rose-400">S/ {(totalLoss * 12).toLocaleString()} al año</strong> botados a la basura por falta de tecnología.
                  </div>
                </div>

                <button
                  onClick={scrollToAppointment}
                  className="w-full py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-rose-600/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Detener Estas Fugas Hoy Mismo</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID DE VIRTUDES (POTENCIA ABSOLUTA) */}
        <section id="modulos" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-100 text-sky-600 text-xs font-black tracking-wide uppercase mb-4">
              <Zap className="w-4 h-4 text-sky-500" />
              Módulos ERP Diseñados para Vender Más
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-4">
              Todo el poder de un ERP multinacional. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">
                Fácil de usar desde tu celular o laptop.
              </span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
              Diseñado pensando en negocios reales con alta rotación: ferreterías, bodegas, minimarkets, tiendas de ropa, calzado, electrodomésticos y distribuidoras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Item 1: POS Ultrarrápido */}
            <div className="md:col-span-8 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200/80 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-sky-500/25">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                    Punto de Venta (POS) Táctil en 3 Segundos
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 font-medium mb-6 leading-relaxed">
                    Cobros rápidos sin colas para cualquier rubro. Lee códigos de barra o QR, aplica cobro mixto (Yape + Efectivo + Tarjeta), asigna comisiones a tus vendedores y emite boletas electrónicas al instante.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm font-bold text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                      Lectura de código de barras física o con cámara de celular.
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                      Arqueos y cierres de caja ciegos por turno.
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                      Comisiones automáticas por asesor de venta.
                    </li>
                  </ul>
                </div>
                <div className="w-full lg:w-72 bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Venta POS</span>
                    <span className="text-xs font-black text-emerald-400">S/ 224.00</span>
                  </div>
                  <div className="py-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Tornillos 2" (Caja x100)</span>
                      <span>S/ 28.00</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Aceite Primor 1L (x3)</span>
                      <span>S/ 36.00</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Stiletto Charol (T.37)</span>
                      <span>S/ 160.00</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Cobrado con: YAPE</span>
                    <span className="text-emerald-400 font-bold">✓ Ticket #0429</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Item 2: Inventario Universal & Series */}
            <div className="md:col-span-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center text-indigo-300 mb-6">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                Inventario Universal & Presentaciones
              </h3>
              <p className="text-sm text-slate-300 font-medium mb-5 leading-relaxed">
                Vende por Paquete, Caja, Saco, Metro, Kilo o Unidad. Si vendes calzado o confección, activa el motor exclusivo de <strong>curvas de series (34-39)</strong> con control de stock individual real por variante.
              </p>
              <div className="space-y-2.5">
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-xs">
                  <div className="text-indigo-200 font-bold">
                    Modo Multirubro (Abarrotes / Ferretería):
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    1 Caja = 24 Unidades • Precios por Mayor y Menor
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-xs">
                  <div className="text-indigo-200 font-bold">
                    Modo Calzado / Ropa:
                  </div>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {["34", "35", "36", "37", "38", "39"].map((sz) => (
                      <span key={sz} className="px-2 py-0.5 bg-indigo-600/60 rounded text-[10px] font-bold">
                        T.{sz}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Item 3: Etiquetas & QR Imprenta */}
            <div className="md:col-span-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-8 sm:p-10 rounded-[2.5rem] shadow-lg shadow-amber-100/50">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-amber-500/30">
                <Printer className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                Diseñador de Etiquetas & QR para Imprenta
              </h3>
              <p className="text-sm sm:text-base text-slate-700 font-medium mb-6">
                Exporta boletines en PDF tamaño A4 en cuadrícula 4x6 con marcas de corte. Imprime 1 etiqueta por código para vitrinas o miles para pegar en tus cajas y productos.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-100/60 px-3 py-2 rounded-xl border border-amber-200 w-fit">
                <Barcode className="w-4 h-4 text-amber-700" />
                <span>Compatible con impresoras térmicas e inyección A4</span>
              </div>
            </div>

            {/* Bento Item 4: Tesorería & Cuentas Pendientes */}
            <div className="md:col-span-7 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200/80 shadow-xl shadow-slate-200/40 relative overflow-hidden">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-500/25">
                <LineChart className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                Tesorería Blindada & Cuentas por Cobrar en Tiempo Real
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-medium mb-4 leading-relaxed">
                Cada gasto o ingreso se registra con su fecha de pago efectuada (hasta el día de hoy) para un balance real. Las operaciones futuras van directo a Cuentas Pendientes con recordatorios por WhatsApp.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Por Cobrar (Pendientes)</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">S/ 14,250.00</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">Liquida con 1 clic</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-rose-700">Por Pagar a Proveedores</div>
                  <div className="text-xl font-black text-rose-900 mt-1">S/ 3,120.00</div>
                  <div className="text-[11px] text-rose-700 mt-0.5">Control de vencimientos</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN FORMULARIO PRO DE AGENDAMIENTO DE CITAS (THE CLOSER) */}
        <section id="agendar-cita" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-24">
          <div className="bg-white rounded-[3rem] p-8 sm:p-14 border-2 border-indigo-100 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-3xl -z-0"></div>

            <div className="max-w-2xl mx-auto text-center mb-10 relative z-10">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1.5 mb-4">
                <Calendar className="w-3.5 h-3.5" />
                Demostración 1 a 1 Gratuita
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
                  Gracias <strong>{appointmentForm.name}</strong>. Hemos agendado tu solicitud para el día{" "}
                  <strong>{appointmentForm.appointmentDate || "próxima fecha"}</strong> a las{" "}
                  <strong>{appointmentForm.appointmentTime}</strong>. Uno de nuestros especialistas te escribirá a tu WhatsApp ({appointmentForm.phone}) para confirmar el enlace.
                </p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/51912509111?text=${encodeURIComponent(
                      `¡Hola! Agendé una cita para mi negocio ${appointmentForm.businessName} para el ${appointmentForm.appointmentDate}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Confirmar por WhatsApp Inmediato</span>
                  </a>
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
                      placeholder="Ej: Carlos Vega"
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
                      Nombre de tu Negocio / Tienda
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
                    ¿Qué te gustaría resolver principalmente? (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Quiero controlar el stock por tallas y que mis vendedores emitan boletas rápido..."
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
                  <span>{appointmentLoading ? "Reservando..." : "Confirmar Mi Demostración Gratuita"}</span>
                </button>
              </form>
            )}
          </div>
        </section>

        {/* SECCIÓN DE PLANES Y PRECIOS CLAROS */}
        <section id="precios" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-24">
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 inline-block mb-3">
              Inversión Transparente
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Planes Diseñados para Multiplicar tu Rentabilidad
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium max-w-xl mx-auto">
              Sin letras chicas. Acceso completo a todas las funciones sin límites abusivos.
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
                <p className="text-xs text-slate-500 mb-6 font-medium">Para tiendas pequeñas, ferreterías o personas que inician su formalización comercial.</p>
                <div className="mb-6">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">A Convenir</div>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">✓ Planes accesibles según tu rubro</span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-700 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Punto de Venta (POS) Táctil</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Control de Stock e Inventario</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Cuentas por Cobrar & Deudores</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Reportes de Ventas en PDF y Excel</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.open("https://wa.me/51912509111?text=Hola%20THINK,%20deseo%20cotizar%20el%20Plan%20Inicial%20Emprendedor%20para%20mi%20negocio", "_blank");
                }}
                className="w-full py-3.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
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
                <p className="text-xs text-slate-300 mb-6 font-medium">Incluye el motor exclusivo de Series, Tallas y Diseñador de Etiquetas QR.</p>
                <div className="mb-6">
                  <div className="text-4xl font-black text-white tracking-tight">Personalizado</div>
                  <span className="text-xs font-bold text-amber-300 block mt-1">✓ Asesoría personalizada y demo guiada</span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-200 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Todo lo del Plan Inicial</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Motor de Series de Calzado (Curvas 34-39)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Diseñador de Etiquetas & Códigos QR</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Comisiones por Asesor de Venta</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Soporte Prioritario 24/7 por WhatsApp</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.open("https://wa.me/51912509111?text=Hola%20THINK,%20deseo%20cotizar%20el%20Plan%20Comercial%20&%20Calzado%20Pro%20para%20mi%20negocio", "_blank");
                }}
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
                <h3 className="text-2xl font-black text-slate-900 mb-2">Multi-Sede</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">Para empresas con múltiples locales, almacenes centrales y distribución.</p>
                <div className="mb-6">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">A Medida</div>
                  <span className="text-xs font-bold text-indigo-600 block mt-1">✓ Despliegue empresarial y migración de datos</span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-700 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Sucursales y Almacenes Ilimitados</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Transferencias de Mercadería entre Sedes</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Roles de Trabajador y Permisos Finos</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Asesoría y Migración de Datos Gratuita</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.open("https://wa.me/51912509111?text=Hola%20THINK,%20deseo%20solicitar%20una%20propuesta%20Corporativa%20Multi-Sede%20para%20mi%20empresa", "_blank");
                }}
                className="w-full py-3.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                <span>Solicitar Propuesta Multi-Sede</span>
              </button>
            </div>
          </div>
        </section>

        {/* GARANTÍA DE SATISFACCIÓN */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
              <Shield className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mb-2">
                Garantía Blindada de 30 Días "Cero Riesgo"
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-emerald-800 leading-relaxed">
                Prueba THINK en tu negocio. Si en los primeros 30 días no sientes que duplicaste el orden y detuviste las fugas de dinero en tu tienda, te devolvemos el 100% de tu dinero sin preguntas. Así de seguros estamos del impacto de nuestro sistema.
              </p>
            </div>
          </div>
        </section>

        {/* SOBRE CORPORACIÓN CCOPLEX */}
        <section id="about" className="py-20 relative bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6">
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
                  THINK nació de una necesidad real: dueños de negocios peruanos que trabajaban de 12 a 14 horas al día pero no veían las ganancias por falta de control tecnológico. Nuestra misión es darte las mismas herramientas de las grandes cadenas a una fracción del costo.
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
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
              T
            </div>
            <span className="text-white font-black text-lg">THINK</span>
            <span className="text-slate-500">• Corporación Ccoplex S.A.C.</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} THINK. Todos los derechos reservados.
          </div>
          <div className="flex gap-4 text-slate-400">
            <a href="#soluciones" className="hover:text-white transition-colors">Soluciones</a>
            <a href="#precios" className="hover:text-white transition-colors">Planes</a>
            <Link to="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
