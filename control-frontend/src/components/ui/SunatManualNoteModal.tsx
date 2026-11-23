import React, { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  FileMinus2,
  FilePlus2,
  PackageCheck,
  Layers,
  ArrowRight,
  Info,
  Sparkles,
  CheckCircle2,
  Percent,
  Calculator,
  Edit3,
} from "lucide-react";
import {
  SUNAT_CATALOGO_09,
  SUNAT_CATALOGO_10,
  getValidEmissionDateRangeForDoc,
} from "../../utils/fiscalUtils";

export const SUNAT_CATALOGO_09_TEXTS: Record<string, string> = {
  "01": "Anulación de la operación por error en la emisión del comprobante original",
  "02": "Anulación por error en el RUC o datos de identificación del adquirente",
  "03": "Corrección por error en la descripción o detalle de los ítems",
  "04": "Descuento global pactado comercialmente con el cliente",
  "05": "Descuento por ítem otorgado al adquirente",
  "06": "Devolución total de mercaderías o productos por parte del cliente",
  "07": "Devolución por ítem de mercaderías",
  "08": "Bonificación comercial otorgada al cliente",
  "09": "Disminución en el valor de venta por error de cálculo o precio",
  "10": "Otros conceptos y rectificaciones comerciales",
  "11": "Ajustes que afecten al IVAP",
  "12": "Ajustes de operaciones de exportación",
  "13": "Ajustes afectos al IVAP",
};

export const SUNAT_CATALOGO_10_TEXTS: Record<string, string> = {
  "01": "Intereses por mora en el pago del comprobante original",
  "02": "Aumento en el valor de venta por ajuste o incremento de precio",
  "03": "Penalidades u otros cobros pactados con el cliente",
  "10": "Ajustes que afecten al IVAP",
  "11": "Ajustes de operaciones de exportación",
  "12": "Ajustes afectos al IVAP",
};

export const SUNAT_QUICK_SUGGESTIONS: Record<string, string[]> = {
  "07_01": [
    "Anulación total por desistimiento de compra del cliente",
    "Anulación por duplicidad involuntaria de comprobante",
    "Error en los datos de la transacción comercial",
  ],
  "07_02": [
    "Anulación por error en el RUC o documento del cliente",
    "Corrección de datos de identificación fiscal del adquirente",
    "Emisión errónea con DNI en vez de RUC",
  ],
  "07_03": [
    "Corrección por error tipográfico en la descripción del ítem",
    "Ajuste en denominación comercial del producto o servicio",
    "Rectificación de especificaciones técnicas del ítem",
  ],
  "07_04": [
    "Descuento global concedido por acuerdo comercial con el cliente",
    "Bonificación comercial global sobre la venta total",
    "Rebaja pactada por pronto pago",
  ],
  "07_05": [
    "Descuento por ítem otorgado al adquirente",
    "Ajuste promocional sobre el precio del producto",
    "Bonificación en precio unitario por volumen",
  ],
  "07_06": [
    "Devolución total de mercaderías por disconformidad del cliente",
    "Devolución integral por falla o defecto del producto",
    "Devolución total por no recepción del pedido",
  ],
  "07_07": [
    "Devolución parcial de mercaderías por solicitud del cliente",
    "Retorno de unidades por inconformidad o no requeridas",
    "Devolución de unidades defectuosas de fábrica",
  ],
  "07_08": [
    "Bonificación comercial de productos adicionales sin costo",
    "Bonificación por cumplimiento de metas de compra",
  ],
  "07_09": [
    "Disminución en el valor de venta por error de cálculo en el precio original",
    "Ajuste de precio pactado comercialmente con el cliente",
    "Rebaja en el importe total por menor cantidad efectivamente entregada",
    "Error involuntario en la digitación del precio unitario",
  ],
  "07_10": [
    "Otros conceptos y rectificaciones comerciales acordadas",
    "Ajuste contable autorizado por gerencia",
  ],
  "08_01": [
    "Intereses moratorios devengados por pago fuera del plazo acordado",
    "Gastos administrativos por cobranza tardía",
  ],
  "08_02": [
    "Aumento en el valor de venta por ajuste o incremento de precio",
    "Cobro adicional por conceptos comerciales omitidos en comprobante",
    "Ajuste por mayor cantidad efectivamente entregada al cliente",
  ],
  "08_03": [
    "Penalidades u otros cobros pactados con el cliente",
    "Cobro de penalidad por cancelación tardía",
  ],
};

export interface SunatManualNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    fullNumber: string;
    docType?: string; // '01', '03'
    serie?: string;
    correlative?: number;
    status?: string;
    customerName?: string;
    customerDocType?: string;
    customerDocNum?: string;
    totalAmount: number;
    issueDate?: string | Date;
    items?: Array<{
      productId?: string;
      code?: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    metadata?: any;
  } | null;
  initialType?: "CREDIT" | "DEBIT";
  onConfirm: (payload: any) => Promise<any> | void;
  isSubmitting?: boolean;
}

export const SunatManualNoteModal: React.FC<SunatManualNoteModalProps> = ({
  isOpen,
  onClose,
  document,
  initialType = "CREDIT",
  onConfirm,
  isSubmitting = false,
}) => {
  const [noteType, setNoteType] = useState<"07" | "08">(initialType === "DEBIT" ? "08" : "07");
  const [reasonCode, setReasonCode] = useState<string>("01");
  const [reasonText, setReasonText] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [issueDate, setIssueDate] = useState<string>("");
  const [inputMode, setInputMode] = useState<"DISCOUNT_AMOUNT" | "TARGET_TOTAL">("DISCOUNT_AMOUNT");
  const [targetTotal, setTargetTotal] = useState<number>(0);

  const [selectedItems, setSelectedItems] = useState<
    Array<{
      productId?: string;
      code?: string;
      name: string;
      customDescription?: string;
      quantity: number;
      price: number;
      returnQty: number;
    }>
  >([]);

  const isFactura = useMemo(() => {
    if (!document) return false;
    const dt = String(document.docType || "").toUpperCase();
    return dt.includes("FACTURA") || dt === "01" || document.fullNumber?.startsWith("F");
  }, [document]);

  const isAlreadyCancelled = useMemo(() => {
    if (!document) return false;
    return document.status === "CANCELLED" || document.status === "ANULADO";
  }, [document]);

  const targetSerie = useMemo(() => {
    if (noteType === "07") {
      return isFactura ? "FC01" : "BC01";
    }
    return isFactura ? "FD01" : "BD01";
  }, [noteType, isFactura]);

  const reasonsList = useMemo(() => {
    return noteType === "07" ? SUNAT_CATALOGO_09 : SUNAT_CATALOGO_10;
  }, [noteType]);

  const dateLimits = useMemo(() => {
    return getValidEmissionDateRangeForDoc(isFactura ? "01" : "03");
  }, [isFactura]);

  const availableBalance = useMemo(() => {
    if (!document) return 0;
    if (document.metadata?.saldo_disponible !== undefined) {
      return Number(document.metadata.saldo_disponible);
    }
    return Number(document.totalAmount) || 0;
  }, [document]);

  // Sincronizar estado al abrir el modal
  useEffect(() => {
    if (isOpen && document) {
      const type = initialType === "DEBIT" ? "08" : "07";
      setNoteType(type);
      const code = type === "07" ? "01" : "02";
      setReasonCode(code);
      const initialText =
        type === "07"
          ? SUNAT_CATALOGO_09_TEXTS[code] || "Anulación de la operación"
          : SUNAT_CATALOGO_10_TEXTS[code] || "Aumento en el valor de venta";
      setReasonText(initialText);
      const balance = availableBalance;
      setAmount(balance);
      setTargetTotal(0);
      setInputMode("DISCOUNT_AMOUNT");
      setIssueDate(dateLimits.maxDate);

      if (document.items && document.items.length > 0) {
        setSelectedItems(
          document.items.map((it) => ({
            productId: it.productId,
            code: it.code || "",
            name: it.name,
            customDescription: it.name,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            returnQty: Number(it.quantity) || 1,
          }))
        );
      } else {
        setSelectedItems([]);
      }
    }
  }, [isOpen, document, initialType, dateLimits.maxDate, availableBalance]);

  // Manejar cambio de motivo oficial
  const handleReasonChange = (newCode: string) => {
    setReasonCode(newCode);
    if (noteType === "07") {
      const defaultText = SUNAT_CATALOGO_09_TEXTS[newCode] || "";
      setReasonText(defaultText);
      if (["01", "02", "06"].includes(newCode)) {
        setAmount(availableBalance);
        setTargetTotal(0);
      } else if (newCode === "03") {
        setAmount(0); // Corrección de descripción no altera monto
        setTargetTotal(availableBalance);
      } else if (newCode === "09" || newCode === "04") {
        // Sugerir reducción a la mitad o disponible por defecto
        setAmount(Number((availableBalance / 2).toFixed(2)) || availableBalance);
        setTargetTotal(Number((availableBalance / 2).toFixed(2)));
      }
    } else {
      const defaultText = SUNAT_CATALOGO_10_TEXTS[newCode] || "";
      setReasonText(defaultText);
      setAmount(0);
    }
  };

  const handleNoteTypeChange = (newType: "07" | "08") => {
    setNoteType(newType);
    const initialCode = newType === "07" ? "01" : "02";
    setReasonCode(initialCode);
    const initialText =
      newType === "07"
        ? SUNAT_CATALOGO_09_TEXTS[initialCode]
        : SUNAT_CATALOGO_10_TEXTS[initialCode];
    setReasonText(initialText || "");
    if (newType === "07") {
      setAmount(availableBalance);
    } else {
      setAmount(0);
    }
  };

  const handleApplyQuickSuggestion = (text: string) => {
    setReasonText(text);
  };

  // Recalcular monto total si el usuario altera cantidades en devolución por ítem (07) o descuento (05)
  const handleItemReturnQtyChange = (index: number, newQty: number) => {
    const updated = [...selectedItems];
    const maxQty = updated[index].quantity;
    const cleanQty = Math.max(0, Math.min(newQty, maxQty));
    updated[index].returnQty = cleanQty;
    setSelectedItems(updated);

    if (noteType === "07" && (reasonCode === "07" || reasonCode === "05")) {
      const calculatedTotal = updated.reduce(
        (sum, it) => sum + it.returnQty * it.price,
        0
      );
      setAmount(Number(calculatedTotal.toFixed(2)));
    }
  };

  // Actualizar descripción corregida para motivo 03
  const handleItemDescriptionChange = (index: number, newDesc: string) => {
    const updated = [...selectedItems];
    updated[index].customDescription = newDesc;
    setSelectedItems(updated);
  };

  // Atajos de porcentaje para descuento
  const handlePercentageDiscount = (pct: number) => {
    const discount = Number(((availableBalance * pct) / 100).toFixed(2));
    setAmount(discount);
    setTargetTotal(Number((availableBalance - discount).toFixed(2)));
  };

  // Cambio de importe en modo 'Nuevo Monto Total'
  const handleTargetTotalChange = (newTotal: number) => {
    const validTotal = Math.max(0, Math.min(newTotal, availableBalance));
    setTargetTotal(validTotal);
    const discount = Number((availableBalance - validTotal).toFixed(2));
    setAmount(discount);
  };

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (noteType === "07") {
      setTargetTotal(Math.max(0, Number((availableBalance - val).toFixed(2))));
    }
  };

  const handleExecute = () => {
    if (isAlreadyCancelled) {
      alert("Este comprobante ya fue anulado previamente. No se pueden emitir más notas.");
      return;
    }

    if (!reasonText.trim()) {
      alert("Por favor ingrese el sustento o motivo tributario detallado para SUNAT.");
      return;
    }

    if (noteType === "07" && reasonCode !== "03") {
      if (amount <= 0) {
        alert("El importe de la Nota de Crédito debe ser mayor a 0.00.");
        return;
      }
      if (amount > availableBalance + 0.005) {
        alert(
          `El monto de la Nota de Crédito (S/ ${amount.toFixed(
            2
          )}) supera el saldo disponible (S/ ${availableBalance.toFixed(2)}).`
        );
        return;
      }
    }

    if (noteType === "08" && amount <= 0) {
      alert("El monto de la Nota de Débito debe ser mayor a 0.00.");
      return;
    }

    const isItemSpecific = noteType === "07" && (reasonCode === "05" || reasonCode === "07" || reasonCode === "03");
    const activeItems = selectedItems.map((it) => ({
      product_id: it.productId,
      code: it.code || "PROD",
      description: it.customDescription || it.name || "Detalle de producto",
      name: it.customDescription || it.name || "Detalle de producto",
      quantity: Number(it.returnQty || it.quantity || 1),
      unit_price: Number(it.price || 0),
      price: Number(it.price || 0),
    }));

    onConfirm({
      note_type: noteType,
      reason_code: reasonCode,
      reason_description: reasonText.trim(),
      reason_text: reasonText.trim(),
      amount: Number(amount),
      issue_date: issueDate,
      items: isItemSpecific && activeItems.length > 0 ? activeItems : undefined,
    });
  };

  if (!isOpen || !document) return null;

  const currentSuggestionsKey = `${noteType}_${reasonCode}`;
  const currentSuggestions = SUNAT_QUICK_SUGGESTIONS[currentSuggestionsKey] || [
    "Ajuste comercial autorizado por mutuo acuerdo",
    "Corrección involuntaria en datos comerciales",
  ];

  const isFullAnnulment = noteType === "07" && ["01", "02", "06"].includes(reasonCode);
  const isDecreaseValue = noteType === "07" && (reasonCode === "09" || reasonCode === "04");
  const isDescriptionCorrection = noteType === "07" && reasonCode === "03";
  const isItemSelection = noteType === "07" && (reasonCode === "05" || reasonCode === "07");

  // Saldo restante proyectado
  const projectedRemainingBalance = noteType === "07"
    ? Math.max(0, Number((availableBalance - amount).toFixed(2)))
    : Number((availableBalance + amount).toFixed(2));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="p-2 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl shadow-sm text-white ${
                noteType === "07" ? "bg-rose-600 shadow-rose-500/20" : "bg-purple-600 shadow-purple-500/20"
              }`}
            >
              {noteType === "07" ? (
                <FileMinus2 className="w-6 h-6" />
              ) : (
                <FilePlus2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  Emisión Oficial de Nota {noteType === "07" ? "de Crédito" : "de Débito"} SUNAT
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  UBL 2.1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprobante afectado:{" "}
                <span className="font-mono font-bold text-slate-900">
                  {document.fullNumber}
                </span>{" "}
                &bull; Serie destino:{" "}
                <span className="font-mono font-bold text-indigo-700">
                  {targetSerie}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Saldo Original
            </span>
            <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
              S/ {availableBalance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ALERTA DE COMPROBANTE YA ANULADO */}
        {isAlreadyCancelled && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 font-medium leading-relaxed">
              <strong className="block font-black text-rose-900 mb-0.5">
                Comprobante Anulado Previamente
              </strong>
              El comprobante {document.fullNumber} ya ha sido anulado formalmente ante SUNAT o su saldo es S/ 0.00. No se pueden emitir notas adicionales sobre él.
            </div>
          </div>
        )}

        {/* SELECTOR NOTA DE CRÉDITO VS NOTA DE DÉBITO */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            disabled={isAlreadyCancelled}
            onClick={() => handleNoteTypeChange("07")}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              noteType === "07"
                ? "bg-white text-rose-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            } disabled:opacity-50`}
          >
            <FileMinus2 className="w-4 h-4" /> Nota de Crédito (Tipo 07)
          </button>
          <button
            type="button"
            disabled={isAlreadyCancelled}
            onClick={() => handleNoteTypeChange("08")}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              noteType === "08"
                ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            } disabled:opacity-50`}
          >
            <FilePlus2 className="w-4 h-4" /> Nota de Débito (Tipo 08)
          </button>
        </div>

        {/* SELECTOR DE MOTIVOS DEL CATÁLOGO SUNAT */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Motivo Oficial ({noteType === "07" ? "Catálogo 09 SUNAT" : "Catálogo 10 SUNAT"}):
          </label>
          <select
            value={reasonCode}
            disabled={isAlreadyCancelled}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
          >
            {reasonsList.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} - {r.description}
              </option>
            ))}
          </select>
        </div>

        {/* SUSTENTO DETALLADO CON SUGERENCIAS CONTEXTUALES DE IA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Sustento o Motivo para SUNAT (cbc:Description en XML):
            </label>
            <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sugerencias inteligentes
            </span>
          </div>
          <textarea
            rows={2}
            value={reasonText}
            disabled={isAlreadyCancelled}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Describa el motivo tributario exacto de la nota..."
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
          />

          {/* Quick Contextual Suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold self-center mr-1">
              Opciones rápidas:
            </span>
            {currentSuggestions.map((sug, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => handleApplyQuickSuggestion(sug)}
                className="text-[10px] px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-medium transition cursor-pointer border border-transparent hover:border-indigo-200"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* MODO CASO 09 / 04: DISMINUCIÓN EN EL VALOR DE VENTA / DESCUENTO GLOBAL */}
        {isDecreaseValue && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-600" />
                Cálculo de Disminución de Importe
              </span>
              <div className="flex items-center gap-1 text-[10px] bg-white p-0.5 rounded-lg border border-amber-200">
                <button
                  type="button"
                  onClick={() => setInputMode("DISCOUNT_AMOUNT")}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    inputMode === "DISCOUNT_AMOUNT"
                      ? "bg-amber-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Monto a Descontar
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("TARGET_TOTAL")}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    inputMode === "TARGET_TOTAL"
                      ? "bg-amber-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Nuevo Total Deseado
                </button>
              </div>
            </div>

            {inputMode === "DISCOUNT_AMOUNT" ? (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-900">
                  ¿Cuánto desea descontar / rebajar del comprobante original?
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-xl p-2.5 pl-8 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-900">
                  ¿Cuál debe ser el nuevo total restante que pagará el cliente?
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={availableBalance}
                    value={targetTotal}
                    onChange={(e) => handleTargetTotalChange(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-xl p-2.5 pl-8 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Atajos de porcentaje rápido */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-amber-800 mr-1 flex items-center gap-0.5">
                <Percent className="w-3 h-3" /> Descuento rápido:
              </span>
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageDiscount(pct)}
                  className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition cursor-pointer"
                >
                  {pct === 100 ? "Total (100%)" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MODO CASO 03: CORRECCIÓN POR ERROR EN LA DESCRIPCIÓN */}
        {isDescriptionCorrection && selectedItems.length > 0 && (
          <div className="space-y-2 border border-blue-200 rounded-2xl p-3 bg-blue-50/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Edición de Descripciones de Ítems
              </span>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                Monto Nota: S/ 0.00 (Normativa SUNAT)
              </span>
            </div>
            <p className="text-[11px] text-blue-800">
              Modifique el texto de los ítems para que SUNAT emita la rectificación oficial:
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedItems.map((it, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-xl border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Original: <strong className="text-slate-800">{it.name}</strong></span>
                    <span>Cant: {it.quantity} &bull; P.U: S/ {it.price.toFixed(2)}</span>
                  </div>
                  <input
                    type="text"
                    value={it.customDescription || ""}
                    onChange={(e) => handleItemDescriptionChange(idx, e.target.value)}
                    placeholder="Ingrese la descripción corregida..."
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLA DE ÍTEMS (Para motivos 05 Descuento por ítem o 07 Devolución por ítem) */}
        {isItemSelection && selectedItems.length > 0 && (
          <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                Selección de Ítems Afectados
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Indique cantidad a devolver o descontar
              </span>
            </div>
            <div className="overflow-x-auto max-h-36 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="py-1.5 px-2">Producto</th>
                    <th className="py-1.5 px-2 text-center">Cant. Orig.</th>
                    <th className="py-1.5 px-2 text-right">P. Unit</th>
                    <th className="py-1.5 px-2 text-center">Cant. Afectada</th>
                    <th className="py-1.5 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedItems.map((it, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="py-2 px-2 font-medium text-slate-800 line-clamp-1 max-w-[200px]">
                        {it.name}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500">
                        {it.quantity}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700">
                        S/ {it.price.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={it.quantity}
                          step="1"
                          value={it.returnQty}
                          onChange={(e) =>
                            handleItemReturnQtyChange(idx, Number(e.target.value) || 0)
                          }
                          className="w-16 text-center text-xs font-bold border border-slate-300 rounded-lg p-1 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                        S/ {(it.returnQty * it.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MONTO Y FECHA DE EMISIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {noteType === "07" ? "Importe de la Nota de Crédito" : "Importe de la Nota de Débito"} (PEN)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={noteType === "07" && reasonCode !== "03" ? availableBalance : undefined}
                value={amount}
                disabled={isAlreadyCancelled || isFullAnnulment || isDescriptionCorrection}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                className={`w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 pl-8 outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isFullAnnulment || isDescriptionCorrection ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                }`}
              />
            </div>
            {isFullAnnulment ? (
              <p className="text-[10px] text-rose-600 mt-1 font-bold">
                Anulación Total: Aplica sobre el 100% del saldo (S/ {availableBalance.toFixed(2)})
              </p>
            ) : isDescriptionCorrection ? (
              <p className="text-[10px] text-blue-600 mt-1 font-bold">
                Monto fiscal S/ 0.00 según normativa SUNAT
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                {noteType === "07" ? `Máximo permitido: S/ ${availableBalance.toFixed(2)}` : "Aumento sobre el total"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Fecha de Emisión de la Nota
            </label>
            <input
              type="date"
              min={dateLimits.minDate}
              max={dateLimits.maxDate}
              value={issueDate}
              disabled={isAlreadyCancelled}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Conforme a R.S. SUNAT: Máximo 3 días retroactivos.
            </p>
          </div>
        </div>

        {/* TARJETA DE RESUMEN Y BALANCE PROYECTADO */}
        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
          noteType === "07"
            ? isFullAnnulment
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-purple-50 border-purple-200 text-purple-900"
        }`}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-bold">Efecto Tributario Proyectado:</span>
              <p className="text-[11px] opacity-90">
                {noteType === "07"
                  ? isFullAnnulment
                    ? `Anulación total: El comprobante ${document.fullNumber} quedará en estado ANULADO ante SUNAT.`
                    : `Disminución de importe: Se emitirá nota por S/ ${amount.toFixed(2)}. Saldo restante: S/ ${projectedRemainingBalance.toFixed(2)}.`
                  : `Incremento de importe: Se sumará S/ ${amount.toFixed(2)}. Nuevo total fiscal: S/ ${projectedRemainingBalance.toFixed(2)}.`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            <span className="text-[10px] uppercase font-bold opacity-75 block">
              {noteType === "07" ? "Saldo Restante" : "Nuevo Total"}
            </span>
            <span className="font-mono font-black text-sm">
              S/ {projectedRemainingBalance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting || isAlreadyCancelled}
            className={`px-5 py-2.5 text-xs font-black rounded-xl text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              noteType === "07"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Transmitiendo a SUNAT...
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                {noteType === "07" ? "Emitir Nota de Crédito Oficial" : "Emitir Nota de Débito Oficial"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
export default SunatManualNoteModal;
