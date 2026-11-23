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
              <p className="text-xs text-slate-500 font-medium">
                Comprobante: <span className="font-mono font-bold text-slate-900">{documentInfo.fullNumber}</span> &bull; Total: <span className="font-mono font-bold text-emerald-700">S/ {documentInfo.totalAmount.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* RESUMEN TRIBUTARIO NORMATIVO */}
        {isFiscal ? (
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
                Emitiendo Nota de Crédito SUNAT...
              </span>
            ) : (
              <>
                <FileX className="w-4 h-4" />
                {isFiscal ? "Emitir Nota de Crédito y Anular" : "Confirmar Eliminación"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
