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
  method: "COMUNICACION_BAJA" | "NOTA_CREDITO";
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
  "ANULACION DE LA OPERACION POR EL EMISOR",
  "ERROR EN DATOS DEL CLIENTE / DOCUMENTO",
  "ERROR DE DIGITACION O IMPORTE EN EL COMPROBANTE",
  "COMPROBANTE DUPLICADO O NO ENTREGADO AL CLIENTE",
  "DEVOLUCION TOTAL DE LA MERCADERIA",
  "VENTA CANCELADA ANTES DE SU DESPACHO",
];

export const SunatAnnulmentModal: React.FC<SunatAnnulmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentInfo,
  isSubmitting = false,
}) => {
  const [deliveredToClient, setDeliveredToClient] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"COMUNICACION_BAJA" | "NOTA_CREDITO">("COMUNICACION_BAJA");
  const [motivo, setMotivo] = useState(MOTIVOS_ANULACION_RAPIDOS[0]);
  const [customMotivo, setCustomMotivo] = useState("");
  const [isCustomMotivo, setIsCustomMotivo] = useState(false);
  const [restoreStock, setRestoreStock] = useState(true);

  // Calcular días transcurridos desde la emisión
  const daysElapsed = useMemo(() => {
    if (!documentInfo?.issueDate) return 0;
    const issueTime = new Date(documentInfo.issueDate).getTime();
    if (isNaN(issueTime)) return 0;
    return Math.max(0, Math.floor((Date.now() - issueTime) / (1000 * 60 * 60 * 24)));
  }, [documentInfo?.issueDate]);

  const isWithin7Days = daysElapsed <= 7;
  const isFiscal = documentInfo?.isBilled ?? false;

  // Actualizar recomendación por defecto al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setDeliveredToClient(false);
      setRestoreStock(true);
      setIsCustomMotivo(false);
      setMotivo(MOTIVOS_ANULACION_RAPIDOS[0]);
      setCustomMotivo("");

      // Lógica de recomendación normativa SUNAT
      if (isWithin7Days) {
        setSelectedMethod("COMUNICACION_BAJA");
      } else {
        setSelectedMethod("NOTA_CREDITO");
      }
    }
  }, [isOpen, isWithin7Days]);

  // Si el usuario cambia si fue entregado al cliente, sincronizar método recomendado
  const handleToggleDelivered = (delivered: boolean) => {
    setDeliveredToClient(delivered);
    if (delivered) {
      setSelectedMethod("NOTA_CREDITO");
    } else if (isWithin7Days) {
      setSelectedMethod("COMUNICACION_BAJA");
    }
  };

  if (!isOpen || !documentInfo) return null;

  const handleExecute = () => {
    const finalMotivo = isCustomMotivo && customMotivo.trim() ? customMotivo.trim() : motivo;
    onConfirm({
      method: isFiscal ? selectedMethod : "COMUNICACION_BAJA",
      motivo: finalMotivo,
      deliveredToClient,
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
                  {isFiscal ? "Anulación Tributaria Oficial SUNAT" : "Eliminar Venta / Nota de Venta"}
                </h3>
                {isFiscal && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    UBL 2.1
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprobante: <span className="font-mono font-bold text-slate-900">{documentInfo.fullNumber}</span> &bull; Total: <span className="font-mono font-bold text-emerald-700">S/ {documentInfo.totalAmount.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* RESUMEN TRIBUTARIO & DIAGNÓSTICO DE TIEMPO */}
        {isFiscal && (
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-700">
                  Emitido hace: <strong className="text-slate-900">{daysElapsed} {daysElapsed === 1 ? "día" : "días"} calendario</strong>
                </span>
              </div>
              {isWithin7Days ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dentro del plazo de 7 días (Apto para Baja)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" /> Superó los 7 días (Requiere Nota de Crédito)
                </span>
              )}
            </div>

            {/* PREGUNTA CLAVE NORMATIVA SUNAT: ¿ENTREGADO AL CLIENTE? */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <p className="text-xs font-black text-slate-800">
                  ¿El comprobante ya fue entregado o enviado al cliente?
                </p>
                <p className="text-[10px] text-slate-500">
                  Norma SUNAT: Si el cliente ya lo tiene en su poder, no debe darse de baja simple, se debe emitir Nota de Crédito.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleDelivered(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    !deliveredToClient
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  No, no fue entregado
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDelivered(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    deliveredToClient
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Sí, ya fue entregado
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPARADOR Y SELECTOR DE LOS 2 CAMINOS LEGALES SUNAT */}
        {isFiscal ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Seleccione el Mecanismo de Anulación Oficial:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* CAMINO 1: COMUNICACIÓN DE BAJA */}
              <div
                onClick={() => setSelectedMethod("COMUNICACION_BAJA")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedMethod === "COMUNICACION_BAJA"
                    ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-400/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                {isWithin7Days && !deliveredToClient && (
                  <span className="absolute -top-2.5 right-3 text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                    ✨ RECOMENDADO SUNAT
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">🏷️</span>
                    <h4 className="text-xs font-black text-slate-900 uppercase">
                      1. Comunicación de Baja
                    </h4>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 mb-2 leading-tight">
                    Anulación directa &bull; Borra el comprobante sin emitir nuevos números.
                  </p>
                  <ul className="text-[10px] text-slate-600 space-y-1 mb-3">
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> No consume correlativos de Nota de Crédito.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> Genera constancia o ticket de baja ante SUNAT.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> Ideal para errores inmediatos antes de enviar al cliente.
                    </li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Plazo SUNAT:</span>
                  <span className={isWithin7Days ? "text-emerald-700 font-black" : "text-amber-700 font-black"}>
                    {isWithin7Days ? "Disponible (≤ 7 días)" : "Vencido (> 7 días)"}
                  </span>
                </div>
              </div>

              {/* CAMINO 2: NOTA DE CRÉDITO ELECTRÓNICA */}
              <div
                onClick={() => setSelectedMethod("NOTA_CREDITO")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedMethod === "NOTA_CREDITO"
                    ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-400/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                {(!isWithin7Days || deliveredToClient) && (
                  <span className="absolute -top-2.5 right-3 text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                    📌 PROCEDIMIENTO REQUERIDO
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">📄</span>
                    <h4 className="text-xs font-black text-slate-900 uppercase">
                      2. Nota de Crédito (Tipo 01)
                    </h4>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 mb-2 leading-tight">
                    Anulación de la Operación &bull; Emite {isFactura ? "FC01" : "BC01"} oficial.
                  </p>
                  <ul className="text-[10px] text-slate-600 space-y-1 mb-3">
                    <li className="flex items-center gap-1.5">
                      <span className="text-blue-600 font-bold">✓</span> Vincula y restaura el valor a S/ 0.00 en SIRE.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-blue-600 font-bold">✓</span> Genera serie y correlativo propio firmado con certificado digital.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-blue-600 font-bold">✓</span> Válido en cualquier momento (incluso tras 7 días o entrega).
                    </li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Serie a emitir:</span>
                  <span className="text-blue-700 font-black font-mono">
                    {isFactura ? "FC01-XXXXXXXX" : "BC01-XXXXXXXX"}
                  </span>
                </div>
              </div>
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
            Motivo de la Anulación {isFiscal ? "(Catálogo SUNAT)" : ""}:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MOTIVOS_ANULACION_RAPIDOS.slice(0, 4).map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setMotivo(m);
                  setIsCustomMotivo(false);
                }}
                className={`p-2 text-left text-xs rounded-xl border transition-all truncate font-medium ${
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
              {isCustomMotivo ? "← Elegir motivo sugerido" : "+ Escribir otro motivo específico"}
            </button>
            {isCustomMotivo && (
              <textarea
                rows={2}
                placeholder="Especifique detalladamente el motivo de la anulación..."
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
              <p className="text-[10px] text-slate-500">Devuelve las unidades al stock automáticamente</p>
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
            className={`px-5 py-2.5 text-xs font-black rounded-xl text-white shadow-md transition-all flex items-center gap-2 ${
              isFiscal && selectedMethod === "COMUNICACION_BAJA"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando ante SUNAT...
              </span>
            ) : (
              <>
                <FileX className="w-4 h-4" />
                {isFiscal
                  ? selectedMethod === "COMUNICACION_BAJA"
                    ? "Confirmar Comunicación de Baja"
                    : "Emitir Nota de Crédito y Anular"
                  : "Confirmar Eliminación"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
