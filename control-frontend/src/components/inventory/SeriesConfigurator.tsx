import { useState, useMemo } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Layers,
  Sparkles,
  Calculator,
  Info,
  Check,
  AlertTriangle,
  X,
  ArrowRightLeft,
  Package,
} from "lucide-react";
import {
  STANDARD_SERIES_PRESETS,
  POPULAR_SHOE_SIZES,
  sortSizes,
  type SizeRatio,
  type SeriesConfig,
} from "../../utils/seriesUtils";

interface SeriesConfiguratorProps {
  seriesConfig: SeriesConfig;
  onChange: (newConfig: SeriesConfig) => void;
  isEditing?: boolean;
  disabled?: boolean;
}

/**
 * Normaliza la curva asegurando que cada talla conserve su ratio en serie
 * y su stock físico real en almacén sin sobreescribirse mutuamente.
 */
const normalizeCurve = (rawCurve: any[]): SizeRatio[] => {
  if (!Array.isArray(rawCurve) || rawCurve.length === 0) return [];

  const map = new Map<string, SizeRatio>();

  rawCurve.forEach((item) => {
    if (!item) return;
    const size = String(item.size ?? item.talla ?? "").trim();
    if (!size) return;

    let ratio = Math.max(1, Number(item.ratio || 1));
    const stock = item.stock !== undefined ? Math.max(0, Number(item.stock)) : undefined;

    // Si viene stock definido > 1 y ratio quedó en 1, sincronizar ratio con stock
    if ((!item.ratio || Number(item.ratio) <= 1) && stock !== undefined && stock > 1) {
      ratio = stock;
    }

    if (map.has(size)) {
      const existing = map.get(size)!;
      if (stock !== undefined) {
        existing.stock = stock;
      }
      existing.ratio = Math.max(existing.ratio, ratio);
      if (item.productId && !existing.productId) existing.productId = item.productId;
      if (item.sku && !existing.sku) existing.sku = item.sku;
      if (item.costPrice !== undefined) existing.costPrice = item.costPrice;
      if (item.salePrice !== undefined) existing.salePrice = item.salePrice;
    } else {
      map.set(size, {
        size,
        ratio,
        stock: stock !== undefined ? stock : ratio,
        productId: item.productId,
        sku: item.sku,
        costPrice: item.costPrice,
        salePrice: item.salePrice,
      });
    }
  });

  const consolidated = Array.from(map.values());
  const sortedSizes = sortSizes(consolidated.map((c) => c.size));
  return sortedSizes.map(
    (sz) => consolidated.find((c) => c.size === sz) || { size: sz, ratio: 1 }
  );
};

export default function SeriesConfigurator({
  seriesConfig,
  onChange,
  disabled = false,
  isEditing = false,
}: SeriesConfiguratorProps) {
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [sizeToRemove, setSizeToRemove] = useState<string | null>(null);
  // Modo de ingreso: "SERIES" (por serie completa) o "UNIT" (por par/unidad)
  const [priceMode, setPriceMode] = useState<"SERIES" | "UNIT">("SERIES");

  const {
    curve: rawCurve = [],
    seriesStock = 1,
    costPricePerSeries = 0,
    salePricePerSeries = 0,
    costPricePerUnit = 0,
    salePricePerUnit = 0,
  } = seriesConfig;

  // Curva procesada que carga las cantidades reales (ej. T.37 = 2)
  const curve = useMemo(() => normalizeCurve(rawCurve), [rawCurve]);  // Suma real de pares por serie (proporciones de la curva)
  const totalUnitsPerSeries = useMemo(() => {
    return curve.reduce((acc, item) => acc + (Number(item.ratio) || 1), 0);
  }, [curve]);

  // Suma total de stock real físico en almacén
  const totalPairsToRegister = useMemo(() => {
    return curve.reduce((acc, item) => {
      const itemStock = item.stock !== undefined ? Number(item.stock) : ((seriesStock || 0) * (Number(item.ratio) || 1));
      return acc + itemStock;
    }, 0);
  }, [curve, seriesStock]);

  // Sincronizar cambios preservando cantidades de stock real y precios según el modo activo
  const syncNormalizedConfig = (newCurve: SizeRatio[], newSeriesStock?: number) => {
    const newTotalUnits = newCurve.reduce((acc, item) => acc + (Number(item.ratio) || 1), 0);
    const stockToUse = newSeriesStock !== undefined ? newSeriesStock : (seriesStock !== undefined ? seriesStock : (isEditing ? 0 : 1));

    let newCostSeries = costPricePerSeries;
    let newCostUnit = costPricePerUnit;
    let newSaleSeries = salePricePerSeries;
    let newSaleUnit = salePricePerUnit;

    if (priceMode === "UNIT") {
      // Modo por unidad: conserva precio unitario y recalcula el total de la serie
      if (newTotalUnits > 0 && costPricePerUnit > 0) {
        newCostSeries = Number((costPricePerUnit * newTotalUnits).toFixed(2));
      }
      if (newTotalUnits > 0 && salePricePerUnit > 0) {
        newSaleSeries = Number((salePricePerUnit * newTotalUnits).toFixed(2));
      }
    } else {
      // Modo por serie: conserva precio de serie y recalcula el precio por unidad
      if (newTotalUnits > 0 && costPricePerSeries > 0) {
        newCostUnit = Number((costPricePerSeries / newTotalUnits).toFixed(2));
      }
      if (newTotalUnits > 0 && salePricePerSeries > 0) {
        newSaleUnit = Number((salePricePerSeries / newTotalUnits).toFixed(2));
      }
    }

    onChange({
      ...seriesConfig,
      unitsPerSeries: newTotalUnits,
      curve: newCurve,
      seriesStock: stockToUse,
      costPricePerSeries: newCostSeries,
      costPricePerUnit: newCostUnit,
      salePricePerSeries: newSaleSeries,
      salePricePerUnit: newSaleUnit,
    });
  };

  // Modificar cantidad de pares de una talla en la serie
  const handleUpdateStock = (size: string, val: number) => {
    const safePares = isNaN(val) ? 1 : Math.max(1, Math.round(val));
    const newStock = (seriesStock || 1) * safePares;
    const updatedCurve = curve.map((item) =>
      item.size === size
        ? { ...item, ratio: safePares, stock: newStock }
        : item
    );
    syncNormalizedConfig(updatedCurve);
  };

  // Delta (+1 / -1) sobre la cantidad de pares de una talla
  const handleDeltaStock = (size: string, delta: number) => {
    const targetItem = curve.find((c) => c.size === size);
    if (!targetItem) return;
    const currentRatio = targetItem.ratio || 1;
    if (currentRatio <= 1 && delta < 0) {
      setSizeToRemove(size);
      return;
    }
    const newRatio = Math.max(1, currentRatio + delta);
    handleUpdateStock(size, newRatio);
  };

  // Aplicar plantilla preset
  const handleApplyPreset = (preset: typeof STANDARD_SERIES_PRESETS[0]) => {
    setActivePresetId(preset.id);
    const newCurve: SizeRatio[] = preset.curve.map((item) => {
      const existing = curve.find((c) => c.size === item.size);
      const ratio = item.ratio || 1;
      return {
        size: item.size,
        ratio,
        stock: existing?.stock !== undefined ? existing.stock : ((seriesStock || 1) * ratio),
      };
    });
    syncNormalizedConfig(newCurve);
  };

  // Añadir o incrementar ratio de talla (+1)
  const handleAddSize = (sizeToAdd: string) => {
    const cleanSize = sizeToAdd.trim();
    if (!cleanSize) return;

    setActivePresetId(null);
    const existingIndex = curve.findIndex((c) => c.size === cleanSize);
    let updatedCurve: SizeRatio[];

    if (existingIndex >= 0) {
      updatedCurve = curve.map((item, idx) => {
        if (idx === existingIndex) {
          const newRatio = (item.ratio || 1) + 1;
          const newStock = (seriesStock || 1) * newRatio;
          return { ...item, ratio: newRatio, stock: newStock };
        }
        return item;
      });
    } else {
      const defaultStock = (seriesStock || 1) * 1;
      updatedCurve = [...curve, { size: cleanSize, ratio: 1, stock: defaultStock }];
      const sorted = sortSizes(updatedCurve.map((c) => c.size));
      updatedCurve = sorted.map(
        (sz) => updatedCurve.find((c) => c.size === sz) || { size: sz, ratio: 1, stock: defaultStock }
      );
    }

    syncNormalizedConfig(updatedCurve);
    setCustomSizeInput("");
  };

  // Disminuir ratio de talla (-1)
  const handleUpdateRatio = (size: string, delta: number) => {
    handleDeltaStock(size, delta);
  };

  // Confirmar eliminación de la talla en el modal
  const confirmRemoveSize = () => {
    if (!sizeToRemove) return;
    setActivePresetId(null);
    const updatedCurve = curve.filter((item) => item.size !== sizeToRemove);
    syncNormalizedConfig(updatedCurve);
    setSizeToRemove(null);
  };

  // Solicitar eliminación desde el botón del bote de basura
  const handleRequestRemoveSize = (size: string) => {
    setSizeToRemove(size);
  };

  // Toggle rápido de curva
  const handleToggleSize = (size: string) => {
    const clean = size.trim();
    if (!clean) return;
    if (curve.some((c) => c.size === clean)) {
      handleRequestRemoveSize(clean);
    } else {
      handleAddSize(clean);
    }
  };

  // Handlers para precios y stock con cálculo bidireccional
  const handleCostSeriesChange = (costSeries: number) => {
    const safeCost = isNaN(costSeries) ? 0 : Math.max(0, costSeries);
    const costUnit =
      totalUnitsPerSeries > 0
        ? Number((safeCost / totalUnitsPerSeries).toFixed(2))
        : 0;
    onChange({
      ...seriesConfig,
      costPricePerSeries: safeCost,
      costPricePerUnit: costUnit,
    });
  };

  const handleCostUnitChange = (costUnit: number) => {
    const safeUnit = isNaN(costUnit) ? 0 : Math.max(0, costUnit);
    const calculatedSeries = Number((safeUnit * totalUnitsPerSeries).toFixed(2));
    onChange({
      ...seriesConfig,
      costPricePerUnit: safeUnit,
      costPricePerSeries: calculatedSeries,
    });
  };

  const handleSaleSeriesChange = (saleSeries: number) => {
    const safeSale = isNaN(saleSeries) ? 0 : Math.max(0, saleSeries);
    const saleUnit =
      totalUnitsPerSeries > 0
        ? Number((safeSale / totalUnitsPerSeries).toFixed(2))
        : 0;
    onChange({
      ...seriesConfig,
      salePricePerSeries: safeSale,
      salePricePerUnit: saleUnit,
    });
  };

  const handleSaleUnitChange = (saleUnit: number, syncSeries = true) => {
    const safeUnit = isNaN(saleUnit) ? 0 : Math.max(0, saleUnit);
    const calculatedSeries = Number((safeUnit * totalUnitsPerSeries).toFixed(2));
    onChange({
      ...seriesConfig,
      salePricePerUnit: safeUnit,
      salePricePerSeries: syncSeries ? calculatedSeries : (salePricePerSeries > 0 ? salePricePerSeries : calculatedSeries),
    });
  };

  const handleSeriesStockChange = (stockVal: number) => {
    const safeStock = isNaN(stockVal) ? 0 : Math.max(0, stockVal);
    if (!isEditing) {
      // Al registrar, distribuir el stock multiplicando por los ratios
      const updatedCurve = curve.map((c) => ({
        ...c,
        stock: safeStock * (c.ratio || 1),
      }));
      syncNormalizedConfig(updatedCurve, safeStock);
    } else {
      onChange({
        ...seriesConfig,
        seriesStock: safeStock,
      });
    }
  };

  return (
    <div className="w-full max-w-full space-y-4 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-blue-50/40 border-2 border-indigo-200/80 rounded-2xl p-3 sm:p-4 shadow-xs overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight truncate">
                Configuración de Serie
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs shrink-0">
                {totalUnitsPerSeries} pares / serie
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium truncate">
              Define tallas y cantidades acumuladas de la serie.
            </p>
          </div>
        </div>

        {/* Total Summary Pill */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-indigo-200 shadow-xs self-start sm:self-auto shrink-0">
          <Calculator className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-[11px] font-black text-gray-700 whitespace-nowrap">
            Stock: <span className="text-indigo-600">{totalPairsToRegister} pares</span>{" "}
            <span className="text-gray-400 font-normal">({seriesStock || 0} {seriesStock === 1 ? "serie" : "series"})</span>
          </span>
        </div>
      </div>

      {/* 1. Curva Rápida / Presets */}
      <div className="bg-white rounded-xl border border-indigo-100 p-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={disabled}
              checked={showPresets}
              onChange={(e) => setShowPresets(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Usar plantillas recomendadas de curvas de calzado
            </span>
          </label>
          <span className="text-[11px] text-gray-400 font-medium">
            {showPresets ? "Plantillas desplegadas" : "Opcional (clic para ver)"}
          </span>
        </div>

        {showPresets && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 animate-fade-in">
            {STANDARD_SERIES_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.01]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                    }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black leading-tight">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-white text-indigo-600 flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-snug ${isSelected ? "text-indigo-100" : "text-gray-500"
                      }`}
                  >
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Curva Personalizada: Tallas y Cantidades Reales */}
      <div className="bg-white rounded-xl border border-indigo-100 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
            Curva Actual ({curve.length} tallas distintas • {totalUnitsPerSeries} pares totales por serie)
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            Usa + y - para ajustar las unidades reales por talla
          </span>
        </div>

        {/* Chips de Tallas: Muestra las cantidades reales acumuladas (ej. T.37 = 2) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {curve.map((item) => {
            const isRepeated = item.ratio > 1;
            const currentStock = item.stock !== undefined ? Number(item.stock) : ((seriesStock || 0) * (item.ratio || 1));
            return (
              <div
                key={item.size}
                className={`p-2.5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isRepeated
                    ? "bg-amber-50/50 border-amber-300 shadow-xs ring-1 ring-amber-200"
                    : "bg-white border-indigo-100 hover:border-indigo-300 shadow-xs"
                }`}
              >
                {/* Header: Talla & Papelera */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                      T.{item.size}
                    </span>
                    {isRepeated && (
                      <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-200/80 px-1 py-0.5 rounded">
                        x{item.ratio}
                      </span>
                    )}
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestRemoveSize(item.size);
                      }}
                      className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white transition-all flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer group"
                      title={`Quitar talla ${item.size} de la serie`}
                    >
                      <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Cantidad de Pares por Serie */}
                <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-xl p-2 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-indigo-950 px-0.5">
                    <span>Pares en Serie:</span>
                    <span className="text-indigo-700 font-extrabold">{item.ratio} {item.ratio === 1 ? "par" : "pares"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      disabled={disabled || item.ratio <= 1}
                      onClick={() => handleDeltaStock(item.size, -1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-rose-500 hover:text-white text-gray-700 border border-indigo-200 font-black flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                      title="Quitar 1 par de esta talla (-1)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      disabled={disabled}
                      value={item.ratio}
                      onChange={(e) => handleUpdateStock(item.size, Number(e.target.value))}
                      className="w-12 text-center font-black text-sm py-1 border border-indigo-300 rounded-lg bg-white text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      title="Cantidad de pares de esta talla en cada serie"
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDeltaStock(item.size, 1)}
                      className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center justify-center transition-all cursor-pointer shadow-xs"
                      title="Añadir 1 par de esta talla (+1)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold text-center">
                    Total almacén: <strong className="text-indigo-900">{item.ratio * (seriesStock || 1)} pares</strong>
                    {seriesStock > 1 ? ` (${seriesStock} series)` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Añadir / Toggle Rápido */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
              Curva rápida (Clic para activar/quitar):
            </span>
            {POPULAR_SHOE_SIZES.map((sz) => {
              const alreadyInCurve = curve.some((c) => c.size === sz);
              return (
                <button
                  key={sz}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleSize(sz)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${alreadyInCurve
                    ? "bg-indigo-600 text-white border border-indigo-600 shadow-xs ring-1 ring-indigo-300 font-black scale-105"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700"
                    }`}
                  title={
                    alreadyInCurve
                      ? `Talla ${sz} en la serie (Clic para quitarla)`
                      : `Añadir talla ${sz} a la serie`
                  }
                >
                  <span>{alreadyInCurve ? `T.${sz}` : `+${sz}`}</span>
                  {alreadyInCurve && (
                    <span className="text-[10px] font-black opacity-80">✕</span>
                  )}
                </button>
              );
            })}

            {/* Custom size input */}
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="text"
                disabled={disabled}
                placeholder="Otra talla..."
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSize(customSizeInput);
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                disabled={disabled || !customSizeInput.trim()}
                onClick={() => handleAddSize(customSizeInput)}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-all cursor-pointer"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Configuración de Stock Inicial y Taco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Stock de Series */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            📦 Stock (Nº Series) *
          </label>
          <input
            type="number"
            min="0"
            step="1"
            required
            disabled={disabled}
            value={seriesStock}
            onChange={(e) => handleSeriesStockChange(e.target.valueAsNumber)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Ej. 10 series"
          />
          <p className="text-[10px] text-gray-400 mt-1 font-medium">
            = {totalPairsToRegister} pares totales a registrar
          </p>
        </div>

        {/* Taco / Altura de Taco */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            👠 Taco / Altura
          </label>
          <select
            disabled={disabled}
            value={seriesConfig.taco || ""}
            onChange={(e) => onChange({ ...seriesConfig, taco: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="">-- Sin Taco / Flat --</option>
            <option value="Sin Taco / Flat">Sin Taco / Flat (Plano)</option>
            <option value="Taco 3">Taco 3 (~3cm)</option>
            <option value="Taco 5">Taco 5 (~5cm)</option>
            <option value="Taco 7">Taco 7 (~7cm)</option>
            <option value="Taco 9">Taco 9 (~9cm)</option>
            <option value="Taco 12">Taco 12 (~12cm)</option>
            <option value="Plataforma">Plataforma</option>
            <option value="Cuña / Wedge">Cuña / Wedge</option>
            <option value="Aguja / Stiletto">Aguja / Stiletto</option>
          </select>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">
            Visible en etiquetas, tickets y filtros
          </p>
        </div>
      </div>

      {/* 4. MODOS DE PRECIOS: POR SERIE COMPLETA O POR PAR / UNIDAD */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-indigo-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                S/
              </span>
              <h5 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight">
                Esquema de Precios de la Serie
              </h5>
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Elige cómo compras/vendes esta mercadería ({totalUnitsPerSeries} pares por serie):
            </p>
          </div>

          {/* Selector de Modo de Precios */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setPriceMode("SERIES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                priceMode === "SERIES"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Por Serie Completa</span>
            </button>
            <button
              type="button"
              onClick={() => setPriceMode("UNIT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                priceMode === "UNIT"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Por Par / Unidad</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Precios de Compra y Venta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* PRECIO DE COMPRA / COSTO */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Precio de Costo / Compra
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                {priceMode === "UNIT" ? "Entrada por Par ➔ Calcula Serie" : "Entrada por Serie ➔ Calcula Par"}
              </span>
            </div>

            {priceMode === "UNIT" ? (
              <>
                {/* Modo UNIT: Usuario ingresa costo por par */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-emerald-800">
                      P. Compra por Par / Unidad (S/) *
                    </label>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={costPricePerUnit || ""}
                    onChange={(e) => handleCostUnitChange(e.target.valueAsNumber)}
                    className="w-full px-3 py-2 bg-white border-2 border-emerald-400 text-emerald-950 rounded-lg text-base font-black focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                    placeholder="Ej. 40.00"
                  />
                </div>

                {/* Resultado automático: Costo por serie */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                      P. Costo por Serie Completa (S/)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Autocalculado
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={costPricePerSeries || ""}
                    onChange={(e) => handleCostSeriesChange(e.target.valueAsNumber)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. 240.00"
                  />
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                    ⚡ {totalUnitsPerSeries} pares × S/ {(costPricePerUnit || 0).toFixed(2)} ={" "}
                    <strong className="text-emerald-700 font-black">
                      S/ {(costPricePerSeries || 0).toFixed(2)}
                    </strong>{" "}
                    costo total de la serie
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Modo SERIES: Usuario ingresa costo por serie */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-indigo-900">
                      P. Costo por Serie Completa (S/) *
                    </label>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={costPricePerSeries || ""}
                    onChange={(e) => handleCostSeriesChange(e.target.valueAsNumber)}
                    className="w-full px-3 py-2 bg-white border-2 border-indigo-400 text-indigo-950 rounded-lg text-base font-black focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                    placeholder="Ej. 240.00"
                  />
                </div>

                {/* Resultado automático: Costo por par */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                      Equivale a Costo por Par / Unidad (S/)
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Autocalculado
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={costPricePerUnit || ""}
                    onChange={(e) => handleCostUnitChange(e.target.valueAsNumber)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ej. 40.00"
                  />
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                    ⚡ S/ {(costPricePerSeries || 0).toFixed(2)} ÷ {totalUnitsPerSeries} pares ={" "}
                    <strong className="text-indigo-700 font-black">
                      S/ {(costPricePerUnit || 0).toFixed(2)}
                    </strong>{" "}
                    costo unitario
                  </p>
                </div>
              </>
            )}
          </div>

          {/* PRECIO DE VENTA */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Precios de Venta
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {priceMode === "UNIT" ? "Entrada por Par ➔ Calcula Serie" : "Entrada por Serie ➔ Calcula Par"}
              </span>
            </div>

            {priceMode === "UNIT" ? (
              <>
                {/* Modo UNIT: Usuario ingresa venta por par */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-blue-900">
                      P. Venta por Par / Unidad (S/) *
                    </label>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={salePricePerUnit || ""}
                    onChange={(e) => handleSaleUnitChange(e.target.valueAsNumber, true)}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-400 text-blue-950 rounded-lg text-base font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                    placeholder="Ej. 60.00"
                  />
                </div>

                {/* Resultado automático: Venta por serie completa */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                      P. Venta Serie Completa S/ (Mayoreo)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Autocalculado
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={salePricePerSeries || ""}
                    onChange={(e) => handleSaleSeriesChange(e.target.valueAsNumber)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. 360.00"
                  />
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                    ⚡ {totalUnitsPerSeries} pares × S/ {(salePricePerUnit || 0).toFixed(2)} ={" "}
                    <strong className="text-blue-700 font-black">
                      S/ {(salePricePerSeries || 0).toFixed(2)}
                    </strong>{" "}
                    precio total serie
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Modo SERIES: Usuario ingresa venta por serie */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-indigo-900">
                      P. Venta Serie S/ (Mayoreo) *
                    </label>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={disabled}
                    value={salePricePerSeries || ""}
                    onChange={(e) => handleSaleSeriesChange(e.target.valueAsNumber)}
                    className="w-full px-3 py-2 bg-white border-2 border-indigo-400 text-indigo-950 rounded-lg text-base font-black focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                    placeholder="Ej. 360.00"
                  />
                </div>

                {/* Venta por par suelto / menudeo */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3 text-amber-500" />
                      P. Venta por Par Suelto (S/) (Menudeo)
                    </label>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                      Menudeo
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    value={salePricePerUnit || ""}
                    onChange={(e) => handleSaleUnitChange(e.target.valueAsNumber, false)}
                    className="w-full px-3 py-1.5 border border-amber-200 bg-amber-50/30 rounded-lg text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ej. 65.00"
                  />
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                    Equivale en serie a: S/ {((salePricePerSeries || 0) / (totalUnitsPerSeries || 1)).toFixed(2)} / par
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nota Informativa */}
      <div className="flex items-start gap-2 bg-indigo-100/50 p-2.5 rounded-xl text-[11px] text-indigo-900 border border-indigo-200/60">
        <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
        <p>
          Al guardar como <strong>Serie</strong>, el sistema registrará las variantes de cada talla de forma coordinada. En el Punto de Venta podrás cobrar la serie completa al por mayor o vender cualquier talla individual al precio de menudeo, descontando su stock automáticamente en tiempo real.
        </p>
      </div>

      {/* 4. MODAL ADVERTENCIA DE ELIMINACIÓN DE TALLA */}
      {sizeToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-rose-100 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setSizeToRemove(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">
                  ¿Quitar Talla {sizeToRemove} de la serie?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Esta acción actualizará la cantidad total de pares de la serie.
                </p>
              </div>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-xs text-rose-800">
              <span className="font-bold">Advertencia:</span> Si estás editando un producto existente, al guardar los cambios esta talla dejará de formar parte del grupo de la serie.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSizeToRemove(null)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRemoveSize}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sí, quitar talla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}