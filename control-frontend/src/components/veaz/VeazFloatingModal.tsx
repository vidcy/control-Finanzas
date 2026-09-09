import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, ArrowRight } from "lucide-react";
import VeazLogo from "./VeazLogo";

interface VeazFloatingModalProps {
  onClose?: () => void;
}

export default function VeazFloatingModal({ onClose }: VeazFloatingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show modal automatically after a short, smooth delay upon entering index
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 650);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleNavigate = () => {
    setIsOpen(false);
    navigate("/veaz-estileza");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Dark Luxury Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 30 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="relative z-10 w-full max-w-xl bg-gradient-to-b from-[#12141F] via-[#0E1017] to-[#0A0B0E] border-2 border-amber-500/40 rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_rgba(217,119,6,0.3)] p-7 sm:p-10 text-center"
        >
          {/* Top Ambient Glow Orb */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-[90px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Crown & Monogram Emblem */}
          <div className="flex justify-center mb-5">
            <VeazLogo size="lg" showSubtitle={true} />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-cinzel font-bold tracking-[0.2em] uppercase mb-4 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>LANZAMIENTO EXCLUSIVO BOUTIQUE</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>

          {/* Headline */}
          <h2 className="font-playfair text-2xl sm:text-4xl font-bold text-white leading-tight mb-3">
            La Alta Costura en Calzados <br />
            <span className="text-gold-gradient">VEAZ ESTILEZA</span>
          </h2>

          {/* Subtitle / Description */}
          <p className="font-outfit text-sm sm:text-base text-slate-300/90 font-light leading-relaxed max-w-md mx-auto mb-7">
            Te invitamos a descubrir nuestro nuevo catálogo de calzados femeninos de gala: Stilettos de ensueño, TACONES Red Carpet y Plataformas organizadas por series completas y tallas exclusivas.
          </p>

          {/* Mini Visual Showcase */}
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            <div className="rounded-2xl overflow-hidden aspect-square border border-amber-500/20 bg-slate-900/60 shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400&auto=format&fit=crop"
                alt="Stilettos VEAZ"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square border border-amber-500/20 bg-slate-900/60 shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?q=80&w=400&auto=format&fit=crop"
                alt="TACONES Red Carpet"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square border border-amber-500/20 bg-slate-900/60 shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=400&auto=format&fit=crop"
                alt="Plataformas Empress"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleNavigate}
              className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-cinzel font-bold text-xs tracking-[0.2em] uppercase hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Entrar a VEAZ ESTILEZA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-outfit text-xs transition-all cursor-pointer"
            >
              Continuar al Sistema
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
