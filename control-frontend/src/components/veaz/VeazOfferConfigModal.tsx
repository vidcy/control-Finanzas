import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Clock, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";

interface VeazOfferConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdated?: () => void;
}

export function getStoredOfferConfig() {
  try {
    const days = Number(localStorage.getItem("veaz_offer_days") || "3");
    let endTime = Number(localStorage.getItem("veaz_offer_end_time"));
    if (!endTime || isNaN(endTime)) {
      endTime = Date.now() + days * 24 * 60 * 60 * 1000;
      localStorage.setItem("veaz_offer_end_time", String(endTime));
    }
    return { days, endTime };
  } catch {
    return { days: 3, endTime: Date.now() + 3 * 24 * 60 * 60 * 1000 };
  }
}

export default function VeazOfferConfigModal({
  isOpen,
  onClose,
  onOfferUpdated,
}: VeazOfferConfigModalProps) {
  const [selectedDays, setSelectedDays] = useState<number>(3);
  const [customDays, setCustomDays] = useState<string>("3");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentEndDate, setCurrentEndDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredOfferConfig();
      setSelectedDays(cfg.days);
      setCustomDays(String(cfg.days));
      setCurrentEndDate(new Date(cfg.endTime));
      setSavedSuccess(false);
    }
  }, [isOpen]);

  const handleApplyPreset = (days: number) => {
    setSelectedDays(days);
    setCustomDays(String(days));
  };

  const handleRenewOffer = () => {
    const days = Math.max(1, Math.min(30, Number(customDays) || selectedDays || 3));
    const newEndTime = Date.now() + days * 24 * 60 * 60 * 1000;

    localStorage.setItem("veaz_offer_days", String(days));
    localStorage.setItem("veaz_offer_end_time", String(newEndTime));

    setCurrentEndDate(new Date(newEndTime));
    setSavedSuccess(true);

    // Notificar al sistema
    window.dispatchEvent(new Event("veaz_offer_updated"));
    if (onOfferUpdated) onOfferUpdated();

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-neutral-900 to-black text-white rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl shadow-amber-500/10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Flame className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-cinzel text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300">
                  Configurar Ofertas de Locura
                </h3>
                <p className="text-xs text-slate-400 font-outfit">
                  Panel visual frontend · Ajuste instantáneo del temporizador
                </p>
              </div>
            </div>

            {/* Status Current */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Vencimiento actual:</span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-300">
                {currentEndDate.toLocaleDateString("es-PE", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Presets */}
            <label className="block text-xs font-cinzel font-bold text-amber-200 uppercase tracking-wider mb-2">
              Seleccionar Tiempo de Descuento:
            </label>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                { days: 1, label: "24 Horas (1 día)" },
                { days: 2, label: "48 Horas (2 días)" },
                { days: 3, label: "3 Días (72 hrs)" },
                { days: 5, label: "5 Días" },
                { days: 7, label: "1 Semana" },
                { days: 14, label: "14 Días" },
              ].map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => handleApplyPreset(p.days)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold font-outfit transition-all border ${
                    selectedDays === p.days
                      ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 font-bold"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <label className="block text-xs text-slate-400 mb-1.5 font-outfit">
                O introduce días personalizados (1 a 30):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value);
                    setSelectedDays(Number(e.target.value));
                  }}
                  className="w-28 px-3 py-2 bg-black/40 border border-amber-500/40 rounded-xl text-amber-200 font-mono text-center text-sm focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-slate-400 font-outfit">
                  días a partir de hoy
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRenewOffer}
                disabled={savedSuccess}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-cinzel font-bold text-sm shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 flex items-center justify-center gap-2 transition-all"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-900" />
                    <span>¡Oferta Renovada con Éxito!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-slate-900" />
                    <span>Renovar & Reiniciar Contador</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-2xl bg-white/10 text-slate-300 font-outfit text-sm hover:bg-white/20 transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Guardado en navegador · Aplica exclusivamente a productos con Precio Ajustado
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
