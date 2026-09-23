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

    const ratio = Math.max(1, Number(item.ratio || 1));
    const stock = item.stock !== undefined ? Math.max(0, Number(item.stock)) : undefined;

    if (map.has(size)) {
      const existing = map.get(size)!;
      if (stock !== undefined) {
        existing.stock = stock;
      }
      if (item.ratio) {
        existing.ratio = Math.max(existing.ratio, ratio);
      }
      if (item.productId && !existing.productId) existing.productId = item.productId;
      if (item.sku && !existing.sku) existing.sku = item.sku;
      if (item.costPrice !== undefined) existing.costPrice = item.costPrice;
      if (item.salePrice !== undefined) existing.salePrice = item.salePrice;
    } else {
      map.set(size, {
        size,
        ratio,
        stock,
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

  // Sincronizar cambios preservando cantidades de stock real
  const syncNormalizedConfig = (newCurve: SizeRatio[], newSeriesStock?: number) => {
    const newTotalUnits = newCurve.reduce((acc, item) => acc + (Number(item.ratio) || 1), 0);
    const stockToUse = newSeriesStock !== undefined ? newSeriesStock : (seriesStock > 0 ? seriesStock : 1);

    const newCostPerUnit =
      newTotalUnits > 0 && costPricePerSeries > 0
        ? Number((costPricePerSeries / newTotalUnits).toFixed(2))
        : costPricePerUnit;

    const newSalePerUnit =
      newTotalUnits > 0 && salePricePerSeries > 0
        ? Number((salePricePerSeries / newTotalUnits).toFixed(2))
        : salePricePerUnit;

    onChange({
      ...seriesConfig,
      unitsPerSeries: newTotalUnits,
      curve: newCurve,
      seriesStock: stockToUse,
      costPricePerUnit: newCostPerUnit,
      salePricePerUnit: newSalePerUnit,
    });
  };

  // Modificar stock físico real de una talla específica
  const handleUpdateStock = (size: string, val: number) => {
    const safeStock = isNaN(val) ? 0 : Math.max(0, Math.round(val));
    const updatedCurve = curve.map((item) =>
      item.size === size ? { ...item, stock: safeStock } : item
    );
    syncNormalizedConfig(updatedCurve);
  };

  // Delta (+1 / -1) sobre el stock físico real de una talla
  const handleDeltaStock = (size: string, delta: number) => {
    const targetItem = curve.find((c) => c.size === size);
    if (!targetItem) return;
    const currentStock = targetItem.stock !== undefined ? Number(targetItem.stock) : ((seriesStock || 0) * (targetItem.ratio || 1));
    const newStock = Math.max(0, currentStock + delta);
    handleUpdateStock(size, newStock);
  };

  // Aplicar plantilla preset
  const handleApplyPreset = (preset: typeof STANDARD_SERIES_PRESETS[0]) => {
    setActivePresetId(preset.id);
    const newCurve: SizeRatio[] = preset.curve.map((item) => {
      const existing = curve.find((c) => c.size === item.size);
      return {
        size: item.size,
        ratio: item.ratio,
        stock: existing?.stock !== undefined ? existing.stock : (seriesStock * item.ratio),
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
      updatedCurve = curve.map((item, idx) =>
        idx === existingIndex ? { ...item, ratio: item.ratio + 1 } : item
      );
    } else {
      const defaultStock = isEditing ? 0 : ((seriesStock || 1) * 1);
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
    setActivePresetId(null);
    const targetItem = curve.find((c) => c.size === size);
    if (!targetItem) return;

    if (targetItem.ratio <= 1 && delta < 0) {
      setSizeToRemove(size);
      return;
    }

    const updatedCurve = curve
      .map((item) => {
        if (item.size === size) {
          const newRatio = Math.max(1, item.ratio + delta);
          return { ...item, ratio: newRatio };
        }
        return item;
      })
      .filter((item) => item.ratio > 0);

    syncNormalizedConfig(updatedCurve);
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

  // Handlers para precios y stock
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

  const handleSaleUnitChange = (saleUnit: number) => {
    const safeUnit = isNaN(saleUnit) ? 0 : Math.max(0, saleUnit);
    const recalculatedSeries = Number((safeUnit * totalUnitsPerSeries).toFixed(2));
    onChange({
      ...seriesConfig,
      salePricePerUnit: safeUnit,
      salePricePerSeries:
        salePricePerSeries > 0 ? salePricePerSeries : recalculatedSeries,
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

                {/* Ratio en la serie */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-1 mb-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 mb-0.5 px-0.5">
                    <span>Ratio en Serie:</span>
                    <span className="text-indigo-600 font-black">{item.ratio} {item.ratio === 1 ? "par" : "pares"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      disabled={disabled || item.ratio <= 1}
                      onClick={() => handleUpdateRatio(item.size, -1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Reducir ratio en la serie"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[11px] font-black text-indigo-900">
                      x{item.ratio}
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleAddSize(item.size)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-all cursor-pointer"
                      title="Aumentar ratio en la serie"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Stock Real en Almacén (Pares Físicos Guardados) */}
                <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-xl p-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-indigo-950 px-0.5">
                    <span>Stock Real:</span>
                    <span className="text-indigo-700 font-extrabold">{currentStock} pares</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      disabled={disabled || currentStock <= 0}
                      onClick={() => handleDeltaStock(item.size, -1)}
                      className="w-6 h-6 rounded-md bg-white hover:bg-rose-500 hover:text-white text-gray-700 border border-gray-200 font-bold flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                      title="Disminuir / Bajar 1 par (-1)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={disabled}
                      value={currentStock}
                      onChange={(e) => handleUpdateStock(item.size, Number(e.target.value))}
                      className="w-12 text-center font-black text-xs py-0.5 border border-indigo-200 rounded-md bg-white text-indigo-950 outline-none focus:ring-1 focus:ring-indigo-500"
                      title="Escribir stock exacto de esta talla"
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDeltaStock(item.size, 1)}
                      className="w-6 h-6 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Aumentar 1 par (+1)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
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

      {/* 3. Configuración de Stock Inicial, Taco y Precios de la Serie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stock de Series */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100">
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
          <p className="text-[10px] text-gray-400 mt-1">
            = {totalPairsToRegister} pares totales
          </p>
        </div>

        {/* Taco / Altura de Taco */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100">
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
          <p className="text-[10px] text-gray-400 mt-1">
            Visible en tickets y filtros
          </p>
        </div>

        {/* Precio Costo */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            P. Costo por Serie (S/)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={disabled}
            value={costPricePerSeries || ""}
            onChange={(e) => handleCostSeriesChange(e.target.valueAsNumber)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Ej. 240.00"
          />
          <p className="text-[10px] text-gray-500 font-semibold mt-1">
            Equivale a{" "}
            <span className="text-gray-900 font-black">
              S/ {costPricePerUnit.toFixed(2)}
            </span>{" "}
            costo por par
          </p>
        </div>

        {/* Precios de Venta */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-gray-700">
              P. Venta Serie S/ (Mayoreo)
            </label>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">
              Serie
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Ej. 360.00"
          />

          {/* Venta por Par Suelto */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-gray-700">
                P. Venta por Par Suelto (S/)
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
              onChange={(e) => handleSaleUnitChange(e.target.valueAsNumber)}
              className="w-full px-2.5 py-1.5 border border-amber-200 bg-amber-50/30 rounded-lg text-xs font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Ej. 65.00"
            />
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