import React, { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import {
  AlertTriangle,
  Clock,
  FileX,
  FileText,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldAlert,
  Send,
  Package,
} from "lucide-react";

export interface SunatAnnulmentOptions {
  method: "NOTA_CREDITO";
  motivo: string;
  deliveredToClient: boolean;
  restoreStock: boolean;
}

export interface SunatAnnulmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: SunatAnnulmentOptions) => Promise<void> | void;
  documentInfo: {
    fullNumber: string;
    documentType?: string;
    totalAmount: number;
    saldoDisponible?: number;
    totalNotasCredito?: number;
    totalNotasDebito?: number;
    hasNotes?: boolean;
    clientName?: string;
    issueDate: Date | string;
    isBilled: boolean;
  } | null;
  isSubmitting?: boolean;
}

export const MOTIVOS_ANULACION_RAPIDOS = [
  "ANULACION DE LA OPERACION (MOTIVO 01 SUNAT)",
  "ANULACION POR ERROR EN EL RUC / DNI (MOTIVO 02 SUNAT)",
  "DEVOLUCION TOTAL DE LA MERCADERIA (MOTIVO 06 SUNAT)",
  "VENTA RESCINDIDA O CANCELADA",
];

export const SunatAnnulmentModal: React.FC<SunatAnnulmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentInfo,
  isSubmitting = false,
}) => {
  const [motivo, setMotivo] = useState(MOTIVOS_ANULACION_RAPIDOS[0]);
  const [customMotivo, setCustomMotivo] = useState("");
  const [isCustomMotivo, setIsCustomMotivo] = useState(false);
  const [restoreStock, setRestoreStock] = useState(true);

  const isFiscal = documentInfo?.isBilled ?? false;
  const totalOriginal = Number(documentInfo?.totalAmount || 0);
  const saldoRestante = documentInfo?.saldoDisponible !== undefined ? Number(documentInfo.saldoDisponible) : totalOriginal;
  const hasAdjustments = Boolean(documentInfo?.hasNotes || (documentInfo?.totalNotasCredito || 0) > 0 || (documentInfo?.totalNotasDebito || 0) > 0 || Math.abs(saldoRestante - totalOriginal) > 0.005);
  const isLiquidated = isFiscal && saldoRestante <= 0.005;

  useEffect(() => {
    if (isOpen) {
      setRestoreStock(true);
      setIsCustomMotivo(false);
      setMotivo(MOTIVOS_ANULACION_RAPIDOS[0]);
      setCustomMotivo("");
    }
  }, [isOpen]);

  if (!isOpen || !documentInfo) return null;

  const handleExecute = () => {
    const finalMotivo = isCustomMotivo && customMotivo.trim() ? customMotivo.trim() : motivo;
    onConfirm({
      method: "NOTA_CREDITO",
      motivo: finalMotivo,
      deliveredToClient: true,
      restoreStock,
    });
  };

  const isFactura = documentInfo.documentType === "FACTURA" || documentInfo.fullNumber.startsWith("F");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="p-1 space-y-4">
        {/* ENCABEZADO PRINCIPAL */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl shadow-sm">
              <FileX className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {isFiscal ? "Anulación Tributaria Oficial con Nota de Crédito" : "Eliminar Venta / Nota de Venta"}
                </h3>
                {isFiscal && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    SUNAT UBL 2.1
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap mt-0.5">
                <span>Comprobante: <strong className="font-mono text-slate-900">{documentInfo.fullNumber}</strong></span>
                <span>&bull;</span>
                {hasAdjustments ? (
                  <span className="flex items-center gap-1.5">
                    <span className="line-through text-slate-400">Orig: S/ {totalOriginal.toFixed(2)}</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Saldo Vigente: S/ {saldoRestante.toFixed(2)}
                    </span>
                  </span>
                ) : (
                  <span>Total: <strong className="font-mono text-emerald-700">S/ {totalOriginal.toFixed(2)}</strong></span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RESUMEN FINANCIERO Y TRIBUTARIO NORMATIVO */}
        {isFiscal ? (
          <div className="space-y-3">
            {hasAdjustments && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Conciliación de Saldos Previos
                  </span>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-indigo-600 text-white rounded-md">
                    CERO SALDO NEGATIVO
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Base Original</span>
                    <span className="text-xs font-black text-slate-700">S/ {totalOriginal.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-blue-500 font-bold block uppercase">+ Notas Débito</span>
                    <span className="text-xs font-black text-blue-700">S/ {(documentInfo.totalNotasDebito || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-rose-500 font-bold block uppercase">- Notas Crédito</span>
                    <span className="text-xs font-black text-rose-700">S/ {(documentInfo.totalNotasCredito || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200 bg-emerald-50/30">
                    <span className="text-[10px] text-emerald-600 font-bold block uppercase">Saldo a Anular</span>
                    <span className="text-xs font-black text-emerald-700">S/ {saldoRestante.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed font-medium pt-1">
                  💡 <strong>Control Tributario SUNAT:</strong> Dado que este comprobante ya cuenta con notas de débito y crédito previas, la Nota de Crédito final se emitirá exactamente por el saldo remanente vigente de <strong>S/ {saldoRestante.toFixed(2)}</strong>. Esto garantiza que la operación quede con saldo final <strong>S/ 0.00</strong> sin incurrir en inconsistencias fiscales por saldos negativos en SIRE / RVIE.
                </p>
              </div>
            )}

            {isLiquidated ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Saldo Comercial Previamente Liquidado (S/ 0.00)</p>
                  <p className="leading-relaxed">
                    Este comprobante ya tiene su saldo comercial completamente liquidado mediante notas previas. La anulación formal ante SUNAT cerrará la operación legalmente (Motivo 01) sin emitir un crédito adicional que generaría saldos negativos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-black text-blue-900">
                    Normativa Tributaria Oficial SUNAT:
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Conforme a la normativa tributaria UBL 2.1 vigente, la anulación formal de un comprobante aceptado por SUNAT se realiza mediante la emisión de una <strong>Nota de Crédito Electrónica ({isFactura ? "Serie FC01" : "Serie BC01"})</strong> bajo el Catálogo 09 (Motivo 01: Anulación de la operación).
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-xs">
                    ✓ Anula el efecto tributario en SIRE
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-xs">
                    ✓ Genera XML, PDF y CDR oficial
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            Esta venta es una <strong>Nota de Venta interna</strong> (no tributaria ante SUNAT). Al eliminarla, se restablecerá el stock en el inventario y se descontará del turno de caja sin afectar declaraciones fiscales.
          </div>
        )}

        {/* MOTIVO DE ANULACIÓN */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Motivo de la Anulación {isFiscal ? "(Catálogo 09 SUNAT)" : ""}:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MOTIVOS_ANULACION_RAPIDOS.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setMotivo(m);
                  setIsCustomMotivo(false);
                }}
                className={`p-2.5 text-left text-xs rounded-xl border transition-all truncate font-medium ${
                  !isCustomMotivo && motivo === m
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsCustomMotivo(!isCustomMotivo)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
            >
              {isCustomMotivo ? "← Elegir motivo sugerido" : "+ Escribir otro sustento específico"}
            </button>
            {isCustomMotivo && (
              <textarea
                rows={2}
                placeholder="Especifique detalladamente el sustento de la anulación..."
                value={customMotivo}
                onChange={(e) => setCustomMotivo(e.target.value)}
                className="w-full mt-1.5 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-medium"
              />
            )}
          </div>
        </div>

        {/* RESTABLECER STOCK */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-xs font-black text-slate-800">Restablecer inventario en almacén</p>
              <p className="text-[10px] text-slate-500">Devuelve las unidades vendidas al stock automáticamente</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={restoreStock}
            onChange={(e) => setRestoreStock(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-800 cursor-pointer"
          />
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
            className="px-5 py-2.5 text-xs font-black rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isFiscal ? "Emitiendo Nota de Crédito SUNAT..." : "Eliminando venta..."}
              </span>
            ) : (
              <>
                <FileX className="w-4 h-4" />
                {isFiscal
                  ? isLiquidated
                    ? "Confirmar Anulación Formal (Saldo en S/ 0.00)"
                    : hasAdjustments
                    ? `Emitir Nota de Crédito por S/ ${saldoRestante.toFixed(2)} y Anular`
                    : "Emitir Nota de Crédito Oficial y Anular"
                  : "Confirmar Eliminación"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
