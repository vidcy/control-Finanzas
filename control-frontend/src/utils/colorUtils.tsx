import React from "react";

export interface ColorVisual {
  name: string;
  hex: string;
  border?: boolean;
  isLight?: boolean;
}

export const KNOWN_COLORS: Record<string, { hex: string; border?: boolean; isLight?: boolean }> = {
  // Neutrals & Basics
  negro: { hex: "#111827" },
  black: { hex: "#111827" },
  blanco: { hex: "#FFFFFF", border: true, isLight: true },
  white: { hex: "#FFFFFF", border: true, isLight: true },
  hueso: { hex: "#F7F4EB", border: true, isLight: true },
  crema: { hex: "#FFFDD0", border: true, isLight: true },
  beige: { hex: "#F5F5DC", border: true, isLight: true },
  nude: { hex: "#E8C5B0", isLight: true },
  arena: { hex: "#E2D3B8", isLight: true },

  // Browns & Earth
  marron: { hex: "#78350F" },
  marrón: { hex: "#78350F" },
  cafe: { hex: "#6F4E37" },
  café: { hex: "#6F4E37" },
  brown: { hex: "#78350F" },
  camel: { hex: "#C19A6B" },
  suela: { hex: "#996515" },
  tan: { hex: "#A77B56" },
  chocolate: { hex: "#4A2C11" },
  madera: { hex: "#854D0E" },
  caramelo: { hex: "#B85D19" },
  habano: { hex: "#7E5835" },

  // Blues
  "azul marino": { hex: "#1E3A8A" },
  navy: { hex: "#1E3A8A" },
  azul: { hex: "#2563EB" },
  blue: { hex: "#2563EB" },
  "azul rey": { hex: "#1D4ED8" },
  "azul noche": { hex: "#0F172A" },
  celeste: { hex: "#38BDF8", isLight: true },
  cielo: { hex: "#7DD3FC", isLight: true },
  sky: { hex: "#38BDF8", isLight: true },
  turquesa: { hex: "#06B6D4" },
  turquoise: { hex: "#06B6D4" },
  indigo: { hex: "#4F46E5" },

  // Reds & Pinks & Wines
  rojo: { hex: "#DC2626" },
  red: { hex: "#DC2626" },
  vino: { hex: "#581845" },
  "vino tinto": { hex: "#581845" },
  borgoña: { hex: "#6B1D2F" },
  burgundy: { hex: "#6B1D2F" },
  guinda: { hex: "#722F37" },
  palo: { hex: "#D8A47F" },
  "palo rosa": { hex: "#D8A47F" },
  rosa: { hex: "#F472B6" },
  pink: { hex: "#F472B6" },
  fucsia: { hex: "#D946EF" },
  fuchsia: { hex: "#D946EF" },
  magenta: { hex: "#E11D48" },
  coral: { hex: "#FF6F61" },
  salmon: { hex: "#FA8072" },
  salmón: { hex: "#FA8072" },

  // Metallics
  dorado: { hex: "#D4AF37" },
  oro: { hex: "#D4AF37" },
  gold: { hex: "#D4AF37" },
  plateado: { hex: "#C0C0C0", border: true },
  plata: { hex: "#C0C0C0", border: true },
  silver: { hex: "#C0C0C0", border: true },
  bronce: { hex: "#CD7F32" },
  bronze: { hex: "#CD7F32" },
  cobre: { hex: "#B87333" },
  cobrizo: { hex: "#B87333" },
  plomo: { hex: "#64748B" },
  acero: { hex: "#64748B" },
  gris: { hex: "#6B7280" },
  gray: { hex: "#6B7280" },
  grey: { hex: "#6B7280" },

  // Greens
  verde: { hex: "#15803D" },
  green: { hex: "#15803D" },
  "verde militar": { hex: "#4D5D53" },
  oliva: { hex: "#556B2F" },
  olive: { hex: "#556B2F" },
  menta: { hex: "#6EE7B7", isLight: true },
  esmeralda: { hex: "#059669" },

  // Yellows & Oranges
  amarillo: { hex: "#EAB308", isLight: true },
  yellow: { hex: "#EAB308", isLight: true },
  mostaza: { hex: "#D97706" },
  mustard: { hex: "#D97706" },
  naranja: { hex: "#EA580C" },
  orange: { hex: "#EA580C" },

  // Purples
  morado: { hex: "#9333EA" },
  purple: { hex: "#9333EA" },
  lila: { hex: "#C084FC", isLight: true },
  violeta: { hex: "#7C3AED" },
  lavanda: { hex: "#C4B5FD", isLight: true },
};

/**
 * Normalizes text to easily find matching color
 */
function normalizeColorName(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Returns visual representation (hex, border, name) for any color string
 */
export function getColorVisual(rawColor?: string | null): ColorVisual | null {
  if (!rawColor || !rawColor.trim()) return null;
  const trimmed = rawColor.trim();

  // If already hex or rgb
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb(") ||
    trimmed.startsWith("rgba(") ||
    trimmed.startsWith("hsl(")
  ) {
    const isLightHex =
      trimmed.startsWith("#") &&
      ["#fff", "#ffffff", "#fefefe", "#f8f9fa", "#f5f5f5", "#f5f5dc", "#e8c5b0"].includes(
        trimmed.toLowerCase()
      );
    return {
      name: trimmed,
      hex: trimmed,
      border: isLightHex,
      isLight: isLightHex,
    };
  }

  const normalized = normalizeColorName(trimmed);

  // Exact match in KNOWN_COLORS
  if (KNOWN_COLORS[normalized]) {
    return {
      name: trimmed,
      hex: KNOWN_COLORS[normalized].hex,
      border: KNOWN_COLORS[normalized].border,
      isLight: KNOWN_COLORS[normalized].isLight,
    };
  }

  // Multi-word phrase search (e.g. "Azul Rey", "Negro Charol", "Rojo Vino")
  for (const [key, value] of Object.entries(KNOWN_COLORS)) {
    const normKey = normalizeColorName(key);
    // If the input includes the key as a standalone word or contains it
    const words = normalized.split(/\s+/);
    if (words.includes(normKey) || normalized.includes(normKey)) {
      return {
        name: trimmed,
        hex: value.hex,
        border: value.border,
        isLight: value.isLight,
      };
    }
  }

  // Fallback: If no match found, generate a stylish consistent slate dot
  return {
    name: trimmed,
    hex: "#64748B",
    border: false,
    isLight: false,
  };
}

/**
 * Returns the hex code or undefined
 */
export function getColorHex(rawColor?: string | null): string {
  const visual = getColorVisual(rawColor);
  return visual?.hex || "#64748B";
}

interface ProductColorBadgeProps {
  color?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
}

export const ProductColorBadge: React.FC<ProductColorBadgeProps> = ({
  color,
  className = "",
  size = "xs",
  showName = true,
}) => {
  const visual = getColorVisual(color);
  if (!visual) return null;

  const dotSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  const textSizes = {
    xs: "text-[9px]",
    sm: "text-[10px]",
    md: "text-xs",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs border border-gray-200/90 shadow-2xs font-bold text-gray-800 shrink-0 ${textSizes[size]} ${className}`}
      title={`Color: ${visual.name}`}
    >
      <span
        className={`rounded-full shrink-0 shadow-2xs ${dotSizes[size]} ${
          visual.border ? "border border-gray-300 ring-1 ring-black/5" : "border border-black/10"
        }`}
        style={{ backgroundColor: visual.hex }}
      />
      {showName && (
        <span className="truncate max-w-[85px] capitalize font-black tracking-tight text-gray-800">
          {visual.name}
        </span>
      )}
    </div>
  );
};
