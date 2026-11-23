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
} from "lucide-react";
import {
  SUNAT_CATALOGO_09,
  SUNAT_CATALOGO_10,
  getValidEmissionDateRangeForDoc,
  validateIssueDateForDoc,
} from "../../utils/fiscalUtils";

export interface SunatManualNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    fullNumber: string;
    docType?: string; // '01', '03'
    serie?: string;
    correlative?: number;
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
  } | null;
  onConfirm: (payload: any) => Promise<any> | void;
  isSubmitting?: boolean;
}

export const SunatManualNoteModal: React.FC<SunatManualNoteModalProps> = ({
  isOpen,
  onClose,
  document,
  onConfirm,
  isSubmitting = false,
}) => {
  const [noteType, setNoteType] = useState<"07" | "08">("07");
  const [reasonCode, setReasonCode] = useState<string>("01");
  const [reasonText, setReasonText] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [issueDate, setIssueDate] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      productId?: string;
      code?: string;
      name: string;
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

  useEffect(() => {
    if (isOpen && document) {
      setNoteType("07");
      setReasonCode("01");
      setReasonText("");
      setAmount(document.totalAmount);
      setIssueDate(dateLimits.maxDate);

      if (document.items && document.items.length > 0) {
        setSelectedItems(
          document.items.map((it) => ({
            productId: it.productId,
            code: it.code || "",
            name: it.name,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            returnQty: Number(it.quantity) || 1,
          }))
        );
      } else {
        setSelectedItems([]);
      }
    }
  }, [isOpen, document, dateLimits.maxDate]);

  // Si cambia el motivo a anulación total (01, 02, 06) o corrección de descripción (03)
  useEffect(() => {
    if (!document) return;
    if (noteType === "07") {
      if (["01", "02", "06"].includes(reasonCode)) {
        setAmount(document.totalAmount);
      } else if (reasonCode === "03") {
        setAmount(0); // Corrección de descripción no altera monto
      }
    }
  }, [reasonCode, noteType, document]);

  const handleExecute = () => {
    if (!reasonText.trim()) {
      alert("Por favor ingrese el sustento o motivo detallado para SUNAT.");
      return;
    }

    if (noteType === "07" && amount > (document?.totalAmount || 0)) {
      alert(`El monto de la Nota de Crédito (S/ ${amount.toFixed(2)}) no puede exceder el monto del comprobante original (S/ ${(document?.totalAmount || 0).toFixed(2)}).`);
      return;
    }

    if (noteType === "07" && reasonCode !== "03" && amount <= 0) {
      alert("El monto de la Nota de Crédito debe ser mayor a 0.00.");
      return;
    }

    if (noteType === "08" && amount <= 0) {
      alert("El monto de la Nota de Débito debe ser mayor a 0.00.");
      return;
    }

    onConfirm({
      note_type: noteType,
      reason_code: reasonCode,
      reason_text: reasonText.trim(),
      amount: Number(amount),
      issue_date: issueDate,
      items: selectedItems.map((it) => ({
        product_id: it.productId,
        code: it.code,
        name: it.name,
        quantity: it.returnQty,
        price: it.price,
      })),
    });
  };

  if (!isOpen || !document) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="p-2 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl shadow-sm text-white ${
                noteType === "07" ? "bg-rose-600" : "bg-purple-600"
              }`}
            >
              {noteType === "07" ? <FileMinus2 className="w-6 h-6" /> : <FilePlus2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  Emisión Manual de Nota Oficial SUNAT
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Modo Contador
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprobante afectado: <span className="font-mono font-bold text-slate-900">{document.fullNumber}</span> &bull; Serie destino: <span className="font-mono font-bold text-indigo-700">{targetSerie}</span>
              </p>
            </div>
          </div>
        </div>

        {/* SELECTOR NOTA DE CRÉDITO VS NOTA DE DÉBITO */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setNoteType("07");
              setReasonCode("01");
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              noteType === "07"
                ? "bg-white text-rose-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileMinus2 className="w-4 h-4" /> Nota de Crédito (Tipo 07)
          </button>
          <button
            type="button"
            onClick={() => {
              setNoteType("08");
              setReasonCode("02");
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              noteType === "08"
                ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
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
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            {reasonsList.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} - {r.description}
              </option>
            ))}
          </select>
        </div>

        {/* INPUT DE SUSTENTO DETALLADO */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Sustento del Motivo (Requerido por SUNAT en el XML):
          </label>
          <textarea
            rows={2}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Describa el motivo tributario exacto de la nota..."
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
          />
        </div>

        {/* MONTO Y FECHA DE EMISIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Importe Total de la Nota (PEN)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={noteType === "07" && reasonCode !== "03" ? document.totalAmount : undefined}
                value={amount}
                disabled={noteType === "07" && reasonCode === "03"}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 pl-8 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {noteType === "07" && (
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                Monto máx permitido: S/ {document.totalAmount.toFixed(2)}
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
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              No puede ser anterior al comprobante ni futura.
            </p>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting}
            className={`px-5 py-2.5 text-xs font-black rounded-xl text-white shadow-md transition-all flex items-center gap-2 ${
              noteType === "07"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Emitiendo Nota ante SUNAT...
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                {noteType === "07" ? "Emitir Nota de Crédito" : "Emitir Nota de Débito"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
