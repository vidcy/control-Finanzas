import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  ArrowRight, Shield, Zap, TrendingUp, Smartphone, 
  PieChart, LineChart, Lock, ChevronRight, CheckCircle2,
  Mail, Phone, MapPin, Target, Users, Sparkles, Building
} from "lucide-react";

export default function LandingPage() {
  useEffect(() => {
    document.title = "THINK | Tus Finanzas Inteligentes - Organiza, Planifica y Crece";
  }, []);

  const { scrollYProgress } = useScroll();
  const yPos = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <div className="min-h-screen bg-[#fafcff] text-slate-900 font-sans selection:bg-indigo-200 selection:text-indigo-900 overflow-x-hidden">
      {/* AURA BACKGROUND GRADIENTS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center">
        <div className="absolute top-[-10%] w-[800px] h-[800px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[150px] opacity-40 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-sky-300 rounded-full mix-blend-multiply filter blur-[150px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-[-10%] w-[600px] h-[600px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[150px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/40 backdrop-blur-xl border-b border-white/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-sky-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              T
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">THINK</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 font-bold text-sm text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Virtudes</a>
            <a href="#about" className="hover:text-indigo-600 transition-colors">Nosotros</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">Seguridad</a>
            <a href="#contact" className="hover:text-indigo-600 transition-colors">Contáctanos</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="text-sm font-bold bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2">
              Empieza Gratis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-indigo-100 text-indigo-600 text-xs font-bold tracking-wide uppercase mb-8 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            La plataforma financiera del futuro
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 max-w-5xl leading-[1.05] mb-8"
          >
            Tus Finanzas Inteligentes. <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 animate-gradient-x">Organiza y Crece.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-12 leading-relaxed font-medium"
          >
            Controla tu dinero, gestiona ingresos, automatiza gastos y escala tus negocios desde un solo lugar. Diseño visualmente perfecto, operatividad impecable.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center"
          >
            <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-full font-black text-lg hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group">
              Crea tu cuenta ahora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-10 py-5 bg-white/80 backdrop-blur-xl border-2 border-slate-200/50 text-slate-900 rounded-full font-bold text-lg hover:bg-white hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              Ingresar al Panel
            </Link>
          </motion.div>
        </section>

        {/* ULTRA MOCKUP: THE APP SHOWCASE */}
        <section className="max-w-7xl mx-auto px-6 relative perspective-1000 mt-10">
          <motion.div
            initial={{ opacity: 0, rotateX: 15, y: 150 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, type: "spring", stiffness: 40 }}
            className="relative rounded-[2.5rem] bg-slate-900/90 backdrop-blur-3xl border-8 border-white/40 shadow-2xl shadow-indigo-900/30 overflow-hidden aspect-[16/10] md:aspect-[21/10] flex flex-col group"
          >
            {/* Top Mac Bar */}
            <div className="h-12 w-full bg-slate-800/50 border-b border-white/10 flex items-center px-6 gap-2 shrink-0">
               <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
               <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
               <div className="mx-auto w-48 h-6 bg-slate-700/50 rounded-md flex items-center justify-center text-xs text-slate-400 font-mono">
                 app.think.ccoplex.com
               </div>
            </div>

            {/* Dashboard Mockup Content */}
            <div className="flex-1 flex w-full h-full p-6 gap-6 relative overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 h-full bg-slate-800/40 rounded-2xl border border-white/5 p-4 flex-col gap-4 hidden lg:flex">
                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">T</div>
                  <div className="text-white font-bold text-lg">THINK</div>
                </div>
                <div className="space-y-2">
                  <div className="h-10 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center px-4 gap-3 font-medium"><PieChart className="w-5 h-5"/> Dashboard</div>
                  <div className="h-10 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl flex items-center px-4 gap-3 font-medium transition-colors"><TrendingUp className="w-5 h-5"/> Ingresos</div>
                  <div className="h-10 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl flex items-center px-4 gap-3 font-medium transition-colors"><Smartphone className="w-5 h-5"/> Punto de Venta</div>
                  <div className="h-10 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl flex items-center px-4 gap-3 font-medium transition-colors"><Building className="w-5 h-5"/> Inventario</div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col gap-6">
                {/* Top KPI row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-32">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="bg-indigo-600 rounded-2xl p-5 border border-indigo-500 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-0 translate-x-1/2 -translate-y-1/2"></div>
                    <div className="text-indigo-200 text-sm font-bold mb-1">Balance General</div>
                    <div className="text-3xl font-black text-white">S/ 124,500.00</div>
                    <div className="mt-2 text-indigo-200 text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +15% este mes</div>
                  </motion.div>
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="bg-slate-800/60 rounded-2xl p-5 border border-white/5 flex flex-col justify-center">
                    <div className="text-slate-400 text-sm font-bold mb-1">Cuentas por Cobrar</div>
                    <div className="text-3xl font-black text-emerald-400">S/ 18,230.50</div>
                  </motion.div>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="bg-slate-800/60 rounded-2xl p-5 border border-white/5 flex flex-col justify-center hidden md:flex">
                    <div className="text-slate-400 text-sm font-bold mb-1">Cuentas por Pagar</div>
                    <div className="text-3xl font-black text-rose-400">S/ 4,120.00</div>
                  </motion.div>
                </div>
                
                {/* Main Graph Area */}
                <div className="flex-1 bg-slate-800/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-white font-bold">Resumen Financiero Anual</div>
                    <div className="flex gap-2">
                      <div className="w-20 h-6 bg-slate-700 rounded-full"></div>
                      <div className="w-16 h-6 bg-slate-700 rounded-full"></div>
                    </div>
                  </div>
                  {/* Fake Chart Lines */}
                  <div className="absolute bottom-0 left-6 right-6 top-20 flex items-end justify-between gap-2 opacity-50">
                    {[40, 60, 30, 80, 50, 90, 70, 100, 60, 85, 45, 75].map((h, i) => (
                      <motion.div 
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        key={i} 
                        className="w-full bg-gradient-to-t from-indigo-500 to-sky-400 rounded-t-sm"
                      ></motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* VIRTUDES Y GALERÍA (BENTO GRID) */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-100 text-sky-600 text-sm font-bold tracking-wide uppercase mb-6"
            >
              Potencia Absoluta
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">Todo el poder de una multinacional. <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">En la palma de tu mano.</span></h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium">THINK no es solo una app, es el motor completo para gestionar tus ingresos, puntos de venta, inventarios y cuentas pendientes con una fluidez inigualable.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Item 1 - POS */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="md:col-span-8 bg-white/80 backdrop-blur-xl border border-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-100 rounded-full blur-[100px] -z-10 group-hover:bg-sky-200 transition-colors duration-700"></div>
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-sky-500/30">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">Punto de Venta (POS) Ultrarrápido</h3>
                  <p className="text-lg text-slate-600 font-medium mb-6">Vende en segundos. Nuestro módulo POS está optimizado para pantallas táctiles, permite cobros mixtos, lee códigos de barras y genera tickets al instante. Nunca hagas esperar a un cliente.</p>
                  <ul className="space-y-3 font-bold text-slate-700">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-sky-500" /> Cobro en efectivo, tarjeta o mixto.</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-sky-500" /> Lectura de códigos de barras.</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-sky-500" /> Emisión de comprobantes digitales.</li>
                  </ul>
                </div>
                <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-3xl p-4 shadow-inner">
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="aspect-square bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center p-2 group-hover:border-sky-200 transition-colors">
                        <div className="w-10 h-10 bg-slate-100 rounded-full mb-2"></div>
                        <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Item 2 - Inventario */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ y: -5 }}
              className="md:col-span-4 bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-10 group-hover:bg-indigo-500/40 transition-colors duration-700"></div>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 border border-white/5 backdrop-blur-md">
                <Building className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4">Inventario Inteligente</h3>
              <p className="text-lg text-slate-400 font-medium mb-8">Controla tu stock al milímetro. Alertas de stock bajo, categorías personalizadas y valoración de inventario en tiempo real.</p>
              
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center"><Sparkles className="w-5 h-5 text-rose-400"/></div>
                    <div>
                      <div className="text-white font-bold">Stock Crítico</div>
                      <div className="text-slate-400 text-xs">Requiere atención</div>
                    </div>
                  </div>
                  <div className="text-rose-400 font-black">12 items</div>
                </div>
              </div>
            </motion.div>

            {/* Bento Item 3 - Pendientes */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="md:col-span-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 p-10 rounded-[2.5rem] shadow-xl shadow-rose-100/50 relative overflow-hidden group"
            >
              <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-rose-500/30">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">Cuentas Pendientes</h3>
              <p className="text-lg text-slate-700 font-medium mb-6">Olvídate del cuaderno. Lleva el registro exacto de quién te debe y a quién le debes. Liquida cuentas con un clic y mantén tus finanzas saludables.</p>
            </motion.div>

            {/* Bento Item 4 - Finanzas */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="md:col-span-7 bg-white/80 backdrop-blur-xl border border-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden group"
            >
              <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-emerald-100 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-200 transition-colors duration-700"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30">
                <LineChart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">Finanzas y Reportes Maestros</h3>
              <p className="text-lg text-slate-600 font-medium">Visualiza tu flujo de caja neto. El cruce entre tus ventas del POS y tus ingresos/gastos externos te da la imagen completa de tu liquidez. Exporta a Excel y PDF al instante.</p>
            </motion.div>
          </div>
        </section>

        {/* SOBRE NOSOTROS (Global Ccoplex) */}
        <section id="about" className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-900"></div>
          <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-indigo-600/20 rounded-full blur-[120px] -z-0"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-indigo-300 text-sm font-bold tracking-wide uppercase mb-6">
                  <Users className="w-4 h-4" />
                  Sobre Nosotros
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8">Respaldado por <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Global Ccoplex.</span></h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed font-medium">
                  THINK es un producto desarrollado con orgullo por **Global Ccoplex**, una empresa dedicada a crear soluciones tecnológicas de impacto. Nuestro objetivo es democratizar el acceso a herramientas financieras de calidad corporativa para emprendedores, pequeños negocios y personas naturales.
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-white mb-1">+500</span>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Negocios Activos</span>
                  </div>
                  <div className="w-px h-16 bg-white/10"></div>
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-white mb-1">99.9%</span>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Uptime Garantizado</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-full border border-white/10 flex items-center justify-center p-8 relative">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-[4px] border-dashed border-indigo-500/30 rounded-full"></motion.div>
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-indigo-500/50 p-12 text-center border-8 border-white/10 backdrop-blur-md">
                    <Target className="w-20 h-20 text-white mb-6" />
                    <h3 className="text-3xl font-black text-white mb-2">Nuestra Misión</h3>
                    <p className="text-indigo-100 font-medium">Que nunca más pierdas un sol por falta de control tecnológico.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY & AUTHORITY */}
        <section id="security" className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 md:p-16 border border-slate-100 shadow-2xl flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-100 to-transparent rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2"></div>
              
              <div className="md:w-1/2 space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold tracking-wide uppercase">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Seguridad y Privacidad Extrema
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">Tus datos operan en una fortaleza inquebrantable.</h2>
                <p className="text-xl text-slate-600 font-medium leading-relaxed">Toda tu información contable, inventario y registros de ventas están encriptados de extremo a extremo. Nosotros no vendemos tus datos; te damos las herramientas para que los protejas.</p>
                
                <ul className="space-y-5 pt-4">
                  <li className="flex items-center gap-4 text-slate-800 font-bold text-lg"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div> Encriptación AES-256 en Base de Datos</li>
                  <li className="flex items-center gap-4 text-slate-800 font-bold text-lg"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Lock className="w-5 h-5 text-emerald-600" /></div> Autenticación segura y JWT</li>
                  <li className="flex items-center gap-4 text-slate-800 font-bold text-lg"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-600" /></div> Copias de seguridad automáticas diarias</li>
                </ul>
              </div>

              <div className="md:w-1/2 flex justify-center relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full"></div>
                <motion.div 
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[3rem] rotate-3 flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-8 border-white backdrop-blur-xl relative z-10"
                >
                  <Shield className="w-32 h-32 text-white" />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACTANOS */}
        <section id="contact" className="py-24 relative bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold tracking-wide uppercase mb-6">
              <Phone className="w-4 h-4" />
              Contáctanos
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">Estamos aquí para ayudarte.</h2>
            <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto mb-16">¿Tienes dudas sobre cómo implementar THINK en tu negocio? Nuestro equipo de soporte está listo para darte una demostración y resolver cualquier inquietud.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <motion.a 
                whileHover={{ y: -5 }}
                href="mailto:soporte-think@ccoplex.com"
                className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center gap-4 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                  <Mail className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Soporte por Correo</h3>
                <p className="text-lg text-indigo-600 font-bold break-all">soporte-think@ccoplex.com</p>
              </motion.a>
              
              <motion.a 
                whileHover={{ y: -5 }}
                href="tel:912509111"
                className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center gap-4 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center group-hover:bg-sky-500 transition-colors duration-300">
                  <Phone className="w-8 h-8 text-sky-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Línea Directa</h3>
                <p className="text-lg text-sky-600 font-bold">+51 912 509 111</p>
              </motion.a>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-32 text-center px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-50/50 -z-10"></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-10">Es hora de tomar el control.</h2>
            <Link to="/register" className="inline-flex items-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-full font-black text-2xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-2 transition-all">
              Empieza Gratis <ArrowRight className="w-8 h-8" />
            </Link>
            <p className="mt-8 text-slate-500 font-bold text-lg">Registro 100% gratuito. Sin tarjetas ocultas. Acceso inmediato.</p>
          </motion.div>
        </section>
      </main>

      {/* MEGA FOOTER */}
      <footer className="bg-slate-900 text-slate-400 pt-20 pb-12 border-t border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -z-0"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                T
              </div>
              <span className="font-black text-3xl tracking-tight text-white">THINK</span>
            </div>
            <p className="text-lg max-w-md font-medium text-slate-400 mb-6 leading-relaxed">
              La plataforma financiera más moderna e inteligente. Respaldado por **Global Ccoplex**. Gestiona tus finanzas y eleva tu negocio al siguiente nivel operativo.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors"><Mail className="w-4 h-4"/></a>
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors"><Phone className="w-4 h-4"/></a>
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors"><MapPin className="w-4 h-4"/></a>
            </div>
          </div>
          
          <div className="md:col-span-2 md:col-start-8">
            <h4 className="text-white font-black text-lg mb-6">Producto</h4>
            <ul className="space-y-4 font-medium">
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">Características</a></li>
              <li><a href="#about" className="hover:text-indigo-400 transition-colors">Sobre Nosotros</a></li>
              <li><a href="#security" className="hover:text-indigo-400 transition-colors">Seguridad de Datos</a></li>
              <li><Link to="/register" className="hover:text-indigo-400 transition-colors">Crear Cuenta</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-3">
            <h4 className="text-white font-black text-lg mb-6">Contáctanos</h4>
            <ul className="space-y-4 font-medium">
              <li className="flex items-center gap-3"><Mail className="w-5 h-5 text-indigo-400"/> soporte-think@ccoplex.com</li>
              <li className="flex items-center gap-3"><Phone className="w-5 h-5 text-indigo-400"/> +51 912 509 111</li>
              <li className="flex items-center gap-3"><Building className="w-5 h-5 text-indigo-400"/> Global Ccoplex S.A.C.</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center relative z-10">
          <p className="font-medium text-sm">&copy; {new Date().getFullYear()} Global Ccoplex. Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Términos Legales</a>
            <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
