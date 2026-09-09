import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Pause, Play } from "lucide-react";
import { VeazCrownIcon } from "./VeazLogo";

export interface HeroSlide {
  id: string;
  title: string;
  highlight: string;
  subtitle: string;
  category: string;
  badge: string;
  image: string;
  modelLook: string;
  ctaText: string;
  filterCategory?: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    title: "DISTRIBUIDOR AUTORIZADO DE CALZADOS ORIGINALES",
    highlight: "LÍNEAS EXCLUSIVAS VIZZANO & MODARE",
    subtitle:
      "Modelos originales con garantía de fábrica. Stilettos de tacón aguja, tacos finos y acabados de lujo para damas exigentes.",
    category: "Stilettos & Tacos",
    badge: "100% ORIGINALES AUTORIZADOS",
    image:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1800&auto=format&fit=crop",
    modelLook: "Colección Vizzano Alta Costura & Stilettos",
    ctaText: "Ver Colección Vizzano",
    filterCategory: "VIZZANO",
  },
  {
    id: "slide-2",
    title: "DISEÑO & PASARELA DE ALTA COSTURA",
    highlight: "MODELOS CALADOS & TACOS DE AUTOR",
    subtitle:
      "Elegancia en cada pisada. Siluetas troqueladas y diseños ergonómicos que definen tendencia en calzado femenino de fiesta.",
    category: "Calados & Tacos",
    badge: "COLECCIÓN CALZADOS 2026",
    image:
      "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?q=80&w=1800&auto=format&fit=crop",
    modelLook: "Calzados Finos de Alta Costura & Diseño Troquelado",
    ctaText: "Explorar Modelos Calados",
    filterCategory: "TACONES",
  },
  {
    id: "slide-3",
    title: "GALA, NOCHE & ALFOMBRA ROJA",
    highlight: "TACONES DE STRASS & FIESTA",
    subtitle:
      "Diseños icónicos con tiras finas, cristales de destello reflectante y soporte anatómico para matrimonios, recepciones y galas.",
    category: "TACONES",
    badge: "BRILLO RED CARPET ORIGINAL",
    image:
      "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?q=80&w=1800&auto=format&fit=crop",
    modelLook: "TACONES de Gala Vizzano & Strass",
    ctaText: "Ver TACONES de Fiesta",
    filterCategory: "MARIMENA",
  },
  {
    id: "slide-4",
    title: "SERIES COMPLETAS & DISPONIBILIDAD INMEDIATA",
    highlight: "CONEXIÓN EN VIVO CON EL INVENTARIO REAL",
    subtitle:
      "Modelos consolidados por serie: consulta tus tallas y cantidades exactas en stock registradas en nuestro sistema de inventario real.",
    category: "Catálogo Real",
    badge: "STOCK REAL EN ALMACÉN",
    image:
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1800&auto=format&fit=crop",
    modelLook: "Tacos Anatómicos & Plataformas de Colección",
    ctaText: "Explorar Todo el Catálogo",
  },
];

interface VeazHeroSliderProps {
  onSelectCategory?: (category: string) => void;
  onExploreCatalog?: () => void;
}

export default function VeazHeroSlider({
  onSelectCategory,
  onExploreCatalog,
}: VeazHeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION = 6500;

  const handleNext = useCallback(() => {
    setDirection("right");
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    setProgress(0);
  }, []);

  const handlePrev = useCallback(() => {
    setDirection("left");
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    setProgress(0);
  }, []);

  const handleGoTo = (index: number) => {
    setDirection(index > currentIndex ? "right" : "left");
    setCurrentIndex(index);
    setProgress(0);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = 100;
    const step = (interval / SLIDE_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, handleNext]);

  const currentSlide = HERO_SLIDES[currentIndex];

  const variants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 120 : -120,
      opacity: 0,
      scale: 1.03,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.6 },
        scale: { duration: 0.8 },
      },
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -120 : 120,
      opacity: 0,
      scale: 0.97,
      transition: { duration: 0.5 },
    }),
  };

  return (
    <div
      className="relative w-full h-[580px] sm:h-[660px] lg:h-[720px] bg-[#FAF8F5] overflow-hidden select-none border-b border-[#F0E6D8]"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* BACKGROUND IMAGE SLIDE (FULL WIDTH) */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={currentSlide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          {/* High-res Image */}
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-[8000ms] scale-105 ease-out"
            style={{ backgroundImage: `url(${currentSlide.image})` }}
          />

          {/* Luminous Light Luxury Gradients (Clean White / Warm Ivory Wash) */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent lg:w-3/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent h-48 bottom-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(245,230,210,0.4),transparent_65%)]" />
        </motion.div>
      </AnimatePresence>

      {/* CONTENT LAYER (EDGE-TO-EDGE FULL WIDTH PADDING) */}
      <div className="relative z-20 w-full h-full px-6 sm:px-12 lg:px-16 xl:px-24 2xl:px-32 flex flex-col justify-center">
        <div className="max-w-2xl">
          {/* Crown & Collection Badge */}
          <motion.div
            key={`badge-${currentSlide.id}`}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-amber-300/80 text-amber-900 backdrop-blur-md text-xs font-cinzel font-bold tracking-[0.2em] uppercase mb-5 shadow-sm"
          >
            <VeazCrownIcon size={16} />
            <span>{currentSlide.badge}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </motion.div>

          {/* Main Title */}
          <motion.div
            key={`title-${currentSlide.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="font-cinzel text-xs sm:text-sm tracking-[0.3em] text-amber-700 font-bold uppercase mb-2">
              {currentSlide.title}
            </h4>
            <h1 className="font-playfair text-4xl sm:text-6xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] mb-4">
              <span className="bg-gradient-to-r from-slate-950 via-amber-950 to-amber-700 bg-clip-text text-transparent block">
                {currentSlide.highlight}
              </span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p
            key={`desc-${currentSlide.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base sm:text-lg text-slate-700 font-outfit font-normal leading-relaxed mb-8 max-w-xl"
          >
            {currentSlide.subtitle}
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            key={`actions-${currentSlide.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => {
                if (currentSlide.filterCategory && onSelectCategory) {
                  onSelectCategory(currentSlide.filterCategory);
                } else if (onExploreCatalog) {
                  onExploreCatalog();
                }
              }}
              className="px-8 py-4 rounded-full bg-slate-900 text-white font-cinzel font-bold text-xs tracking-[0.2em] uppercase hover:bg-amber-600 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group cursor-pointer shadow-md"
            >
              <span>{currentSlide.ctaText}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-amber-300" />
            </button>

            <button
              onClick={onExploreCatalog}
              className="px-7 py-4 rounded-full bg-white/90 border border-slate-300 text-slate-800 font-cinzel text-xs tracking-[0.2em] uppercase hover:border-amber-500 hover:bg-white transition-all cursor-pointer shadow-sm"
            >
              Ver Todas las Series
            </button>
          </motion.div>
        </div>
      </div>

      {/* MODEL LOOKBOOK FLOATING BADGE */}
      <div className="absolute bottom-8 right-6 md:right-16 z-20 hidden sm:flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/90 border border-[#EADBCC] backdrop-blur-xl shadow-lg">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-cinzel font-bold tracking-widest text-amber-700">
            Lookbook de Pasarela
          </span>
          <span className="text-xs font-semibold text-slate-900">
            {currentSlide.modelLook}
          </span>
        </div>
      </div>

      {/* CONTROLS (ARROWS & PROGRESS) */}
      <div className="absolute bottom-8 left-6 sm:left-12 lg:left-16 xl:left-24 z-30 flex items-center gap-4">
        {/* Previous */}
        <button
          onClick={handlePrev}
          aria-label="Diapositiva anterior"
          className="w-11 h-11 rounded-full bg-white border border-[#EADBCC] text-slate-800 flex items-center justify-center hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all active:scale-90 shadow-sm cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next */}
        <button
          onClick={handleNext}
          aria-label="Siguiente diapositiva"
          className="w-11 h-11 rounded-full bg-white border border-[#EADBCC] text-slate-800 flex items-center justify-center hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all active:scale-90 shadow-sm cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pausar slider" : "Reanudar slider"}
          className="w-8 h-8 rounded-full bg-white/70 border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Slide Indicators Dots */}
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => handleGoTo(idx)}
              aria-label={`Ir a diapositiva ${idx + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${idx === currentIndex
                  ? "w-8 bg-amber-600 shadow-sm"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
            />
          ))}
        </div>
      </div>

      {/* TOP PROGRESS BAR */}
      <div className="absolute top-0 inset-x-0 h-1 bg-slate-200/50 z-30">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 via-amber-600 to-yellow-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
