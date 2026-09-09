import React from "react";

interface VeazLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  variant?: "gold" | "white" | "dark";
  className?: string;
  onClick?: () => void;
}

export const VeazCrownIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "w-6 h-6",
  size = 28,
}) => (
  <svg
    width={size}
    height={size * 0.65}
    viewBox="0 0 100 65"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="crownGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF2B2" />
        <stop offset="25%" stopColor="#EAB308" />
        <stop offset="50%" stopColor="#CA8A04" />
        <stop offset="75%" stopColor="#A16207" />
        <stop offset="100%" stopColor="#FACC15" />
      </linearGradient>
      <linearGradient id="crownGemGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* Diadem Base Bar */}
    <rect
      x="12"
      y="52"
      width="76"
      height="7"
      rx="3.5"
      fill="url(#crownGoldGradient)"
    />

    {/* Base Inset Jewels */}
    <circle cx="24" cy="55.5" r="1.8" fill="#FFF" />
    <circle cx="37" cy="55.5" r="1.8" fill="#FFF" />
    <circle cx="50" cy="55.5" r="2.2" fill="#FFF" />
    <circle cx="63" cy="55.5" r="1.8" fill="#FFF" />
    <circle cx="76" cy="55.5" r="1.8" fill="#FFF" />

    {/* Imperial Crown Arches and Peaks */}
    <path
      d="M14 50 L10 24 L28 38 L50 8 L72 38 L90 24 L86 50 Z"
      fill="url(#crownGoldGradient)"
      stroke="#854D0E"
      strokeWidth="0.8"
    />

    {/* Inner Crown Relief */}
    <path
      d="M20 48 L22 34 L34 44 L50 20 L66 44 L78 34 L80 48 Z"
      fill="none"
      stroke="#FFFBEB"
      strokeWidth="1.2"
      opacity="0.7"
    />

    {/* Central Crown Top Peak */}
    <circle cx="50" cy="7" r="4.5" fill="url(#crownGemGradient)" />
    <circle cx="50" cy="7" r="2" fill="#FFFFFF" />

    {/* Side Crown Jewels */}
    <circle cx="10" cy="22" r="3.2" fill="url(#crownGemGradient)" />
    <circle cx="10" cy="22" r="1.3" fill="#FFFFFF" />

    <circle cx="90" cy="22" r="3.2" fill="url(#crownGemGradient)" />
    <circle cx="90" cy="22" r="1.3" fill="#FFFFFF" />

    <circle cx="29" cy="36" r="2.5" fill="url(#crownGemGradient)" />
    <circle cx="71" cy="36" r="2.5" fill="url(#crownGemGradient)" />
  </svg>
);

export default function VeazLogo({
  size = "md",
  showText = true,
  showSubtitle = true,
  variant: _variant = "gold",
  className = "",
  onClick,
}: VeazLogoProps) {
  const sizes = {
    sm: {
      emblemW: 42,
      emblemH: 46,
      crownSize: 22,
      titleClass: "text-lg tracking-[0.24em]",
      subClass: "text-[9px] tracking-[0.28em]",
      gap: "gap-2.5",
    },
    md: {
      emblemW: 52,
      emblemH: 56,
      crownSize: 30,
      titleClass: "text-2xl tracking-[0.26em]",
      subClass: "text-[10px] tracking-[0.32em]",
      gap: "gap-3",
    },
    lg: {
      emblemW: 72,
      emblemH: 78,
      crownSize: 42,
      titleClass: "text-3xl md:text-4xl tracking-[0.3em]",
      subClass: "text-xs tracking-[0.35em]",
      gap: "gap-4",
    },
    xl: {
      emblemW: 96,
      emblemH: 104,
      crownSize: 56,
      titleClass: "text-4xl md:text-5xl tracking-[0.32em]",
      subClass: "text-sm tracking-[0.4em]",
      gap: "gap-5",
    },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none ${sizes.gap} ${onClick ? "cursor-pointer group" : ""
        } ${className}`}
    >
      {/* MONOGRAM EMBLEM: "VE" WITH CROWN OVER THE LETTERS */}
      <div
        className="relative flex flex-col items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ width: sizes.emblemW, height: sizes.emblemH }}
      >
        {/* Soft Ambient Halo */}
        <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-lg -z-10 group-hover:bg-amber-400/35 transition-all" />

        {/* Crown Positioned directly over the letters V and E */}
        <div className="absolute -top-1.5 z-20 transition-all duration-300 group-hover:-translate-y-0.5">
          <VeazCrownIcon size={sizes.crownSize} />
        </div>

        {/* Monogram Box / Letters VE in Luxury White/Pearl Shield */}
        <svg
          width={sizes.emblemW}
          height={sizes.emblemH}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="veGoldGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#854D0E" />
              <stop offset="30%" stopColor="#CA8A04" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="85%" stopColor="#A16207" />
              <stop offset="100%" stopColor="#713F12" />
            </linearGradient>

            <linearGradient id="shieldBorderLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EAB308" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FDE047" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#CA8A04" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="shieldBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#FFFDF7" />
            </linearGradient>
          </defs>

          {/* Luxury Crest Shield Outline with Pearl Fill */}
          <path
            d="M50 22 C72 22 86 30 86 52 C86 74 65 89 50 95 C35 89 14 74 14 52 C14 30 28 22 50 22 Z"
            fill="url(#shieldBg)"
            stroke="url(#shieldBorderLight)"
            strokeWidth="2.2"
          />

          {/* Inner Accent Ring */}
          <path
            d="M50 27 C68 27 80 34 80 52 C80 70 62 83 50 89 C38 83 20 70 20 52 C20 34 32 27 50 27 Z"
            fill="none"
            stroke="url(#shieldBorderLight)"
            strokeWidth="0.8"
            strokeDasharray="2 3"
            opacity="0.6"
          />

          {/* Letter V */}
          <path
            d="M27 42 H38 L45 74 H41 L31 46 H27 Z"
            fill="url(#veGoldGradientLight)"
          />
          <path
            d="M45 74 L55 42 H64 L49 74 H45 Z"
            fill="url(#veGoldGradientLight)"
            opacity="0.9"
          />

          {/* Letter E intertwined with V */}
          <path
            d="M54 42 H73 V47 H59 V56 H70 V61 H59 V70 H74 V75 H54 Z"
            fill="url(#veGoldGradientLight)"
          />

          {/* Central Sparkle Star */}
          <circle cx="50" cy="58" r="1.8" fill="#EAB308" />
        </svg>
      </div>

      {/* TYPOGRAPHY / BRAND NAME (LIGHT THEME LUXURY) */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-cinzel font-black uppercase tracking-[0.24em] transition-colors leading-none text-slate-900 drop-shadow-sm ${sizes.titleClass}`}
            >
              VEAZ
            </span>
            <span
              className={`font-playfair font-normal italic tracking-[0.16em] transition-colors leading-none text-amber-600 ${sizes.titleClass}`}
            >
              ESTILEZA
            </span>
          </div>

          {showSubtitle && (
            <div className="flex items-center gap-2 mt-1">
              <span className="h-[1px] w-3.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              <span
                className={`font-cinzel uppercase font-semibold text-slate-500 ${sizes.subClass}`}
              >
                Esencia y Moda
              </span>
              <span className="h-[1px] w-3.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
