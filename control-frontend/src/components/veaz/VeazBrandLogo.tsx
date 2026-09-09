import React from "react";

export interface BrandStyleConfig {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentColor: string;
  glowColor: string;
  tagline: string;
  isAuthorized?: boolean;
}

export const BRAND_CONFIGS: Record<string, BrandStyleConfig> = {
  VIZZANO: {
    name: "VIZZANO",
    badgeBg: "bg-gradient-to-r from-slate-950 via-zinc-900 to-black",
    badgeBorder: "border-amber-400/80 hover:border-amber-300",
    badgeText: "text-amber-300",
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.25)",
    tagline: "DISTRIBUIDOR AUTORIZADO",
    isAuthorized: true,
  },
  MARIMENA: {
    name: "MARIMENA",
    badgeBg: "bg-gradient-to-r from-rose-950 via-pink-950 to-neutral-900",
    badgeBorder: "border-rose-400/80 hover:border-rose-300",
    badgeText: "text-rose-300",
    accentColor: "#FB7185",
    glowColor: "rgba(251, 113, 133, 0.25)",
    tagline: "ALTA COSTURA & FIESTA",
    isAuthorized: true,
  },
  EDWIN: {
    name: "EDWIN",
    badgeBg: "bg-gradient-to-r from-blue-950 via-slate-950 to-slate-900",
    badgeBorder: "border-cyan-400/80 hover:border-cyan-300",
    badgeText: "text-cyan-300",
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.25)",
    tagline: "LÍNEA VARONES CALZADOS FINOS",
    isAuthorized: true,
  },
  XIOMARA: {
    name: "XIOMARA",
    badgeBg: "bg-gradient-to-r from-purple-950 via-indigo-950 to-neutral-900",
    badgeBorder: "border-fuchsia-400/80 hover:border-fuchsia-300",
    badgeText: "text-fuchsia-300",
    accentColor: "#E879F9",
    glowColor: "rgba(232, 121, 249, 0.25)",
    tagline: "DISEÑO DE AUTOR EXCLUSIVO",
    isAuthorized: true,
  },
  "VEAZ ESTILEZA": {
    name: "VEAZ ESTILEZA",
    badgeBg: "bg-gradient-to-r from-amber-950 via-yellow-950 to-neutral-950",
    badgeBorder: "border-amber-400 hover:border-amber-300",
    badgeText: "text-amber-300",
    accentColor: "#FBBF24",
    glowColor: "rgba(251, 191, 36, 0.3)",
    tagline: "ALTA MODA EN CALZADOS",
    isAuthorized: true,
  },
};

export function getBrandConfig(rawBrandName?: string): BrandStyleConfig {
  if (!rawBrandName) {
    return {
      name: "VEAZ ESTILEZA",
      badgeBg: "bg-gradient-to-r from-slate-900 via-neutral-900 to-zinc-900",
      badgeBorder: "border-amber-500/70",
      badgeText: "text-amber-300",
      accentColor: "#F59E0B",
      glowColor: "rgba(245, 158, 11, 0.2)",
      tagline: "CALZADOS DE LUJO",
    };
  }

  const upper = rawBrandName.trim().toUpperCase();
  for (const [key, cfg] of Object.entries(BRAND_CONFIGS)) {
    if (upper.includes(key) || key.includes(upper)) {
      return { ...cfg, name: rawBrandName };
    }
  }

  // Generador dinámico para cualquier marca nueva
  return {
    name: rawBrandName,
    badgeBg: "bg-gradient-to-r from-stone-900 via-neutral-900 to-zinc-900",
    badgeBorder: "border-amber-400/60 hover:border-amber-300",
    badgeText: "text-amber-200",
    accentColor: "#EAB308",
    glowColor: "rgba(234, 179, 8, 0.2)",
    tagline: "LÍNEA EXCLUSIVA AUTORIZADA",
    isAuthorized: true,
  };
}

interface VeazBrandLogoProps {
  brandName?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export const VeazBrandLogo: React.FC<VeazBrandLogoProps> = ({
  brandName = "VIZZANO",
  size = "md",
  showTagline = false,
  className = "",
}) => {
  const cfg = getBrandConfig(brandName);
  const upper = (brandName || "").trim().toUpperCase();

  // Dimensión de contenedor
  const sizeClasses = {
    sm: "px-2.5 py-1 text-[10px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  }[size];

  // SVG exclusivo según marca
  const renderBrandIcon = () => {
    if (upper.includes("VIZZANO")) {
      return (
        <svg
          viewBox="0 0 40 24"
          className={size === "sm" ? "w-5 h-3.5" : "w-6 h-4"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vizzano 'V' Winged Crest */}
          <path
            d="M5 4L20 21L35 4L30 4L20 16L10 4H5Z"
            fill="url(#vizzanoGold)"
          />
          <circle cx="20" cy="4" r="2.5" fill="#FDE047" />
          <defs>
            <linearGradient id="vizzanoGold" x1="5" y1="4" x2="35" y2="21">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    if (upper.includes("MARIMENA")) {
      return (
        <svg
          viewBox="0 0 40 24"
          className={size === "sm" ? "w-5 h-3.5" : "w-6 h-4"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Marimena 'M' Regal Script Ribbon */}
          <path
            d="M6 19V6L15 15L20 10L25 15L34 6V19H29V11L25 15L20 9L15 15L11 11V19H6Z"
            fill="url(#marimenaRose)"
          />
          <circle cx="20" cy="5" r="2" fill="#FDA4AF" />
          <defs>
            <linearGradient id="marimenaRose" x1="6" y1="6" x2="34" y2="19">
              <stop offset="0%" stopColor="#FFF1F2" />
              <stop offset="50%" stopColor="#FB7185" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    if (upper.includes("EDWIN")) {
      return (
        <svg
          viewBox="0 0 40 24"
          className={size === "sm" ? "w-5 h-3.5" : "w-6 h-4"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Edwin Masculine Shield Crest */}
          <path
            d="M20 2L10 6V13C10 18 14 21.5 20 23C26 21.5 30 18 30 13V6L20 2Z"
            stroke="url(#edwinCyan)"
            strokeWidth="1.5"
            fill="#0F172A"
          />
          <path
            d="M16 8H24V10.5H19V12H23V14H19V15.5H24V18H16V8Z"
            fill="url(#edwinCyan)"
          />
          <defs>
            <linearGradient id="edwinCyan" x1="10" y1="2" x2="30" y2="23">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    if (upper.includes("XIOMARA")) {
      return (
        <svg
          viewBox="0 0 40 24"
          className={size === "sm" ? "w-5 h-3.5" : "w-6 h-4"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Xiomara Designer 'X' Gem */}
          <path
            d="M12 5L20 13L28 5H33L23 15L33 21H28L20 15L12 21H7L17 13L7 5H12Z"
            fill="url(#xiomaraPurple)"
          />
          <circle cx="20" cy="3" r="1.8" fill="#F0ABFC" />
          <defs>
            <linearGradient id="xiomaraPurple" x1="7" y1="5" x2="33" y2="21">
              <stop offset="0%" stopColor="#FDF4FF" />
              <stop offset="50%" stopColor="#E879F9" />
              <stop offset="100%" stopColor="#A21CAF" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    // Default Crown & Initials
    return (
      <svg
        viewBox="0 0 40 24"
        className={size === "sm" ? "w-5 h-3.5" : "w-6 h-4"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 18L12 8L20 14L28 8L32 18H8Z"
          fill="url(#defaultGold)"
        />
        <circle cx="12" cy="7" r="1.5" fill="#FEF08A" />
        <circle cx="20" cy="12" r="1.8" fill="#FEF08A" />
        <circle cx="28" cy="7" r="1.5" fill="#FEF08A" />
        <defs>
          <linearGradient id="defaultGold" x1="8" y1="8" x2="32" y2="18">
            <stop offset="0%" stopColor="#FEF9C3" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#854D0E" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm transition-all duration-300 ${cfg.badgeBg} ${cfg.badgeBorder} ${sizeClasses} ${className}`}
      style={{
        boxShadow: `0 2px 10px ${cfg.glowColor}`,
      }}
    >
      {renderBrandIcon()}
      <div className="flex flex-col text-left leading-none">
        <span
          className={`font-cinzel font-black tracking-wider uppercase ${cfg.badgeText}`}
        >
          {cfg.name}
        </span>
        {showTagline && (
          <span className="text-[8px] font-sans font-semibold tracking-wider text-slate-300 opacity-90 uppercase mt-0.5">
            {cfg.tagline}
          </span>
        )}
      </div>
    </div>
  );
};
