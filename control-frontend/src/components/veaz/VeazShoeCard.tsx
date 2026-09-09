import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Maximize2,
  Layers,
  MessageCircle,
  ArrowRight,
  Flame,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { GroupedShoeModel } from "./veazTypes";
import { VeazBrandLogo, getBrandConfig } from "./VeazBrandLogo";

interface VeazShoeCardProps {
  shoe: GroupedShoeModel;
  onOpenLightbox: (shoe: GroupedShoeModel) => void;
}

export default function VeazShoeCard({ shoe, onOpenLightbox }: VeazShoeCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>(
    shoe.availableSizes.length > 0 ? shoe.availableSizes[0] : ""
  );

  const selectedVariant = shoe.variants.find((v) => v.size === selectedSize);
  const sizeStock = selectedVariant ? selectedVariant.stock : shoe.totalStock;

  // Check if current variant or shoe has an active offer
  const isOfferActive = Boolean(
    (selectedVariant?.adjustedPrice &&
      selectedVariant.adjustedPrice > 0 &&
      selectedVariant.adjustedPrice < selectedVariant.salePrice) ||
    (shoe.hasOffer && shoe.adjustedPrice && shoe.adjustedPrice > 0)
  );

  const currentSalePrice = selectedVariant?.salePrice || shoe.minPrice;
  const currentOfferPrice = isOfferActive
    ? selectedVariant?.adjustedPrice || shoe.adjustedPrice || currentSalePrice
    : null;

  const discountPercent =
    isOfferActive && currentOfferPrice
      ? Math.round(((currentSalePrice - currentOfferPrice) / currentSalePrice) * 100)
      : shoe.discountPercent;

  // Countdown timer connected to localStorage & configurable frontend days
  const computeTimeLeft = useCallback(() => {
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
  }, []);

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
  }, [isOfferActive, computeTimeLeft]);

  // Brand config styling
  const brandCfg = getBrandConfig(shoe.brandName);

  // Display image fallback
  const displayImage =
    shoe.imageUrl ||
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=900&auto=format&fit=crop";

  const handleWhatsAppInquiry = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = "51984398565"; // beas.estileza phone
    const finalPrice = (currentOfferPrice || currentSalePrice).toFixed(2);
    const offerTag = isOfferActive ? ` ¡PRECIO DE LOCURA (Oferta)!` : "";
    const text = `Hola *VEAZ ESTILEZA*, deseo consultar el modelo *${shoe.name}* (Marca: ${shoe.brandName}, SKU: ${shoe.sku}) en Talla *${selectedSize || "37"}*, Color: *${shoe.color}*, ${shoe.heelHeight}. Precio: S/ ${finalPrice}${offerTag}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border transition-all duration-400 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 ${isOfferActive
          ? "border-rose-300 hover:border-rose-400 hover:shadow-rose-500/15"
          : "border-slate-200 hover:border-amber-400 hover:shadow-amber-500/15"
        }`}
      style={{
        boxShadow: isOfferActive
          ? "0 4px 20px -2px rgba(225, 29, 72, 0.08)"
          : undefined,
      }}
    >
      {/* 1. TOP IMAGE CONTAINER (COMPACT & UNIFORM) */}
      <div
        className="relative w-full aspect-[4/3] sm:aspect-square bg-gradient-to-b from-[#FAF8F5] to-[#F3EDE6] overflow-hidden flex items-center justify-center p-4 sm:p-5 cursor-pointer"
        onClick={() => onOpenLightbox(shoe)}
      >
        {/* Ambient Brand Color Glow */}
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at center, ${brandCfg.accentColor}, transparent 70%)`,
          }}
        />

        {/* Shoe Image */}
        <img
          src={displayImage}
          alt={shoe.name}
          className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] group-hover:scale-108 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* TOP BRAND BADGE (WITH DISTINCT LOGO & PALETTE) */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 pointer-events-none">
          <VeazBrandLogo brandName={shoe.brandName} size="sm" showTagline={false} />
        </div>

        {/* SKU BADGE */}
        {shoe.sku && (
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-slate-200/90 text-[9px] font-mono text-slate-700 font-semibold backdrop-blur-md shadow-2xs">
              {shoe.sku}
            </span>
          </div>
        )}

        {/* COLOR SWATCH BADGE ("REDONDITO BONITO CON EL COLOR") */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs pointer-events-none">
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-inner ring-1 ring-black/15"
            style={{
              backgroundColor: shoe.colorHex || "#8A7D71",
            }}
          />
          <span className="text-[10px] font-cinzel font-bold text-slate-800 tracking-wider uppercase">
            {shoe.color}
          </span>
        </div>

        {/* QUICK EXPAND HOVER BUTTON */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenLightbox(shoe)
          }
          }
          className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-900 border border-slate-200 flex items-center justify-center shadow-md opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-slate-950 hover:text-amber-300 hover:border-slate-950 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Ver en grande"
          aria-label="Ver en grande"
        >
          <Maximize2 className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>

        {/* OFERTA FLASH OVERLAY TAG */}
        {isOfferActive && (
          <div className="absolute top-10 left-2.5 sm:top-11 sm:left-3 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-cinzel font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 fill-white" />
              <span>OFERTA DE LOCURA</span>
            </span>
          </div>
        )}
      </div>

      {/* 2. BODY CONTENT (UNIFORM & COMPACT ACROSS ALL CARDS) */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between bg-white">
        <div>
          {/* Heel Height (Taco) & Family Header */}
          <div className="flex items-center justify-between text-[11px] font-outfit mb-1 gap-1">
            <span className="text-slate-500 font-cinzel font-bold tracking-wider text-[10px] uppercase truncate">
              {shoe.familyName || "Calzados Finos"}
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-950 font-cinzel font-bold text-[10px] tracking-wide">
              👠 {shoe.heelHeight || "Taco Estilizado"}
            </span>
          </div>

          {/* Model Title - Uniform 2 lines clamp */}
          <h3
            onClick={() => onOpenLightbox(shoe)}
            className="font-playfair text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-1 cursor-pointer mb-2"
            title={shoe.name}
          >
            {shoe.name}
          </h3>

          {/* 3. PRICE & OFFER SECTION - IDENTICAL FIXED HEIGHT FOR ALL CARDS */}
          <div className="mb-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between min-h-[76px]">
            {isOfferActive ? (
              /* ACTIVE OFFER ROW */
              <>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-playfair text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
                      S/ {currentOfferPrice?.toFixed(2)}
                    </span>
                    <span className="line-through text-slate-400 text-xs font-outfit">
                      S/ {currentSalePrice.toFixed(2)}
                    </span>
                  </div>
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-mono font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full border border-rose-200">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                {/* COUNTDOWN TIMER ROW */}
                <div className="mt-1 pt-1 border-t border-rose-100 flex items-center justify-between text-rose-700">
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-rose-600 text-rose-600 animate-pulse" />
                    <span className="text-[9px] font-cinzel font-bold uppercase tracking-wider text-slate-800">
                      Termina en:
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] font-black text-rose-700 tabular-nums">
                    <Clock className="w-2.5 h-2.5 text-rose-600" />
                    <span>
                      {timeLeft.hours}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* REGULAR NON-OFFER ROW (SAME HEIGHT, NEVER EMPTY) */
              <>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-playfair text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    S/ {currentSalePrice.toFixed(2)}
                  </span>
                  <span className="text-[9px] font-cinzel font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    GARANTIZADO
                  </span>
                </div>

                {/* ELEGANT MATCHING VALUE PILL (MAINTAINS GRID BALANCE) */}
                <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-1 text-[9px] font-cinzel font-medium text-slate-700">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Garantía de Fábrica Original</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                    {shoe.totalStock} en serie
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 4. SIZES SERIES PILLS */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-slate-700 font-cinzel uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Layers className="w-3 h-3 text-amber-600" /> Tallas:
              </span>
              {selectedSize && (
                <span className="text-[9px] font-mono font-semibold text-slate-600">
                  {sizeStock > 0 ? `T${selectedSize}: ${sizeStock} disp.` : `T${selectedSize}: Agotada`}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {shoe.availableSizes.map((size) => {
                const variant = shoe.variants.find((v) => v.size === size);
                const hasStock = variant ? variant.stock > 0 : true;
                const isSelected = selectedSize === size;

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`h-7 min-w-[36px] px-1.5 rounded-lg font-cinzel font-bold text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-0.5 border ${isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : hasStock
                          ? "bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through opacity-50 cursor-not-allowed"
                      }`}
                    title={`Talla ${size}: ${hasStock ? `${variant?.stock || 0} pares` : "Agotada"}`}
                  >
                    <span>{size}</span>
                    <span
                      className={`text-[8.5px] font-mono ${isSelected ? "text-amber-300" : "text-slate-400"
                        }`}
                    >
                      ({variant?.stock ?? 0})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. BOTTOM ACTION BUTTONS */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleWhatsAppInquiry}
            className="flex-1 py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-cinzel font-bold text-[11px] tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Pedir por WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
            <span>Pedir T.{selectedSize || "37"}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLightbox(shoe)}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
            title="Ver detalles"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
