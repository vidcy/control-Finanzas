import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageCircle,
  ShieldCheck,
  Layers,
  Flame,
} from "lucide-react";
import type { GroupedShoeModel } from "./veazTypes";
import { VeazCrownIcon } from "./VeazLogo";
import { VeazBrandLogo } from "./VeazBrandLogo";

interface VeazImageLightboxProps {
  shoe: GroupedShoeModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VeazImageLightbox({
  shoe,
  isOpen,
  onClose,
}: VeazImageLightboxProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");

  useEffect(() => {
    if (shoe && shoe.availableSizes.length > 0) {
      setSelectedSize(shoe.availableSizes[0]);
    }
    setZoomLevel(1);
  }, [shoe]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const selectedVariant = shoe?.variants.find((v) => v.size === selectedSize);
  const sizeStock = selectedVariant ? selectedVariant.stock : shoe?.totalStock || 0;

  // Check offer
  const isOfferActive = Boolean(
    (selectedVariant?.adjustedPrice && selectedVariant.adjustedPrice > 0 && selectedVariant.adjustedPrice < selectedVariant.salePrice) ||
    (shoe?.hasOffer && shoe?.adjustedPrice && shoe.adjustedPrice > 0)
  );

  const currentSalePrice = selectedVariant?.salePrice || shoe?.minPrice || 0;
  const currentOfferPrice = isOfferActive
    ? selectedVariant?.adjustedPrice || shoe?.adjustedPrice || currentSalePrice
    : null;

  const discountPercent =
    isOfferActive && currentOfferPrice && currentSalePrice > 0
      ? Math.round(((currentSalePrice - currentOfferPrice) / currentSalePrice) * 100)
      : shoe?.discountPercent || 0;

  // Countdown timer connected to localStorage & configurable frontend days
  const computeTimeLeft = () => {
    let target = Number(localStorage.getItem("veaz_offer_end_time"));
    const now = Date.now();
    if (!target || isNaN(target) || target <= now) {
      const days = Number(localStorage.getItem("veaz_offer_days") || "3");
      target = now + days * 24 * 3600 * 1000;
      localStorage.setItem("veaz_offer_end_time", String(target));
    }
    const diff = Math.max(0, target - now);
    return {
      hours: Math.floor(diff / (3600 * 1000)),
      minutes: Math.floor((diff % (3600 * 1000)) / (60 * 1000)),
      seconds: Math.floor((diff % (60 * 1000)) / 1000),
    };
  };

  const [timeLeft, setTimeLeft] = useState(computeTimeLeft);

  useEffect(() => {
    if (!isOfferActive) return;
    const tick = () => setTimeLeft(computeTimeLeft());
    const interval = setInterval(tick, 1000);
    const handleUpdate = () => setTimeLeft(computeTimeLeft());
    window.addEventListener("veaz_offer_updated", handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("veaz_offer_updated", handleUpdate);
    };
  }, [isOfferActive]);

  if (!isOpen || !shoe) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.35, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.35, 1));
  const handleResetZoom = () => setZoomLevel(1);

  // WhatsApp order link
  const whatsappNumber = "51984398565";
  const finalPrice = (currentOfferPrice || currentSalePrice).toFixed(2);
  const offerTag = isOfferActive ? ` (¡Oferta Especial!)` : "";
  const whatsappMsg = encodeURIComponent(
    `👑 *CONSULTA VEAZ ESTILEZA*\n\nHola, deseo adquirir el modelo:\n• *Modelo:* ${shoe?.name}\n• *SKU:* ${shoe?.sku}\n• *Marca:* ${shoe?.brandName}\n• *Color:* ${shoe?.color}\n• *Taco:* ${shoe?.heelHeight}\n• *Talla:* ${selectedSize || "Por confirmar"}\n• *Precio:* S/ ${finalPrice}${offerTag}\n\n¿Podrían indicarme disponibilidad y opciones de entrega inmediata?`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMsg}`;

  const displayImage =
    shoe.imageUrl ||
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=900&auto=format&fit=crop";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 md:p-8 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-white border border-[#EDE2D4] rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row"
        >
          {/* TOP RIGHT CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-11 h-11 rounded-full bg-white/90 border border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
            aria-label="Cerrar visor"
          >
            <X className="w-5 h-5" />
          </button>

          {/* LEFT: INTERACTIVE ZOOMABLE IMAGE VIEWER */}
          <div className="relative flex-1 bg-gradient-to-b from-[#FAF8F5] to-[#F5EFEB] min-h-[360px] sm:min-h-[460px] lg:min-h-[580px] flex items-center justify-center overflow-hidden group">
            {/* Ambient Warm Glow Behind Shoe */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),transparent_70%)] pointer-events-none" />

            {/* High-Res Shoe Image with Dynamic Zoom */}
            <motion.img
              src={displayImage}
              alt={shoe.name}
              animate={{ scale: zoomLevel }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.16)] select-none"
              draggable={false}
            />

            {/* Floating Top Left Brand Tag */}
            <div className="absolute top-5 left-5 z-20 flex items-center gap-2">
              <span className="px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-amber-300 text-xs font-cinzel font-bold text-amber-900 tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <VeazCrownIcon size={14} />
                <span>{shoe.brandName}</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/90 text-xs font-mono text-slate-700 font-bold border border-slate-200 shadow-xs">
                {shoe.sku}
              </span>
            </div>

            {/* FLOATING ZOOM CONTROLS (BOTTOM LEFT) */}
            <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-lg">
              <button
                onClick={handleZoomIn}
                className="w-9 h-9 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Ampliar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="w-9 h-9 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="w-9 h-9 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Restablecer vista"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono text-slate-600 font-semibold border-l border-slate-200">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          </div>

          {/* RIGHT: COMPLETE PRODUCT SPECIFICATIONS & ORDER */}
          <div className="w-full lg:w-[440px] p-6 sm:p-8 bg-white flex flex-col justify-between overflow-y-auto border-t lg:border-t-0 lg:border-l border-[#EDE2D4]">
            <div>
              {/* Brand Logo & Crown badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <VeazBrandLogo brandName={shoe.brandName} size="md" showTagline={true} />
                <span className="text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-xs">
                  {shoe.totalStock > 0 ? `${shoe.totalStock} en serie` : "Bajo Pedido"}
                </span>
              </div>

              {/* Title */}
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                {shoe.name}
              </h2>

              {/* Description */}
              <p className="text-sm text-slate-600 font-outfit leading-relaxed mb-5">
                {shoe.description}
              </p>

              {/* Key Specs Pills */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-cinzel font-bold text-slate-500 block mb-1">
                    Color
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-inner"
                      style={{
                        backgroundColor: shoe.colorHex || "#8A7D71",
                        boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15)",
                      }}
                    />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {shoe.color}
                    </span>
                  </div>
                </div>
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-cinzel font-bold text-slate-500 block mb-0.5">
                    Altura Taco
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    👠 {shoe.heelHeight || "Taco Confort"}
                  </span>
                </div>
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-slate-200/80 col-span-2">
                  <span className="text-[10px] uppercase font-cinzel font-bold text-slate-500 block mb-0.5">
                    Material Capellada
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {shoe.material || "Cuero Genuino & Acabados de Lujo"}
                  </span>
                </div>
              </div>

              {/* Price Display */}
              <div className={`p-4 rounded-2xl mb-6 border ${isOfferActive
                  ? "bg-gradient-to-br from-rose-50 via-amber-50/50 to-rose-50 border-rose-200/90 shadow-sm"
                  : "bg-[#FAF7F2] border-[#E8DCBE]"
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-[11px] font-cinzel uppercase font-bold text-amber-900 block mb-0.5">
                      {isOfferActive ? "¡Precio de Locura (Oferta)!" : "Precio Exclusivo"}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-playfair text-3xl font-black ${isOfferActive ? "text-rose-600" : "text-slate-900"}`}>
                        S/ {(currentOfferPrice || currentSalePrice).toFixed(2)}
                      </span>
                      {isOfferActive && (
                        <span className="line-through text-slate-400 text-base font-outfit">
                          S/ {currentSalePrice.toFixed(2)}
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="text-[11px] font-mono font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Envío disponible</span>
                    <span className="text-xs font-bold text-slate-800">Todo el Perú</span>
                  </div>
                </div>

                {/* COUNTDOWN TIMER FOR OFFERS */}
                {isOfferActive && (
                  <div className="mt-2.5 pt-2.5 border-t border-rose-200/60 flex items-center justify-between text-xs font-mono font-bold text-rose-700">
                    <span className="flex items-center gap-1 font-cinzel text-[11px] uppercase tracking-wider text-slate-800">
                      <Flame className="w-3.5 h-3.5 fill-rose-600 text-rose-600 animate-pulse" />
                      Oferta termina en:
                    </span>
                    <span className="tabular-nums font-black text-rose-700">
                      {timeLeft.hours}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s
                    </span>
                  </div>
                )}
              </div>

              {/* SIZES SERIES SELECTION (CRITICAL) */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-cinzel uppercase tracking-wider mb-2.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" /> Selecciona tu Talla:
                  </span>
                  {selectedSize && (
                    <span className="text-xs font-mono font-bold text-amber-800">
                      {sizeStock > 0 ? `${sizeStock} pares disponibles` : "Sin stock"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {shoe.availableSizes.map((size) => {
                    const variant = shoe.variants.find((v) => v.size === size);
                    const hasStock = variant ? variant.stock > 0 : true;
                    const isSelected = selectedSize === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`h-11 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center border ${isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105"
                          : hasStock
                            ? "bg-[#FAF8F5] text-slate-800 border-slate-200 hover:border-amber-500 hover:bg-amber-50"
                            : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <span>{size}</span>
                        <span className="text-[9px] font-mono opacity-80">
                          {variant && variant.stock > 0 ? `${variant.stock}p` : "ok"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-cinzel font-bold text-xs tracking-[0.15em] uppercase flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                <span>Pedir este Modelo en Talla {selectedSize || "37"}</span>
              </a>

              <div className="flex items-center justify-center gap-4 text-slate-500 text-[11px] font-outfit pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Garantía de Calidad
                </span>
                <span>•</span>
                <span>Cambio de Talla Garantizado</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
