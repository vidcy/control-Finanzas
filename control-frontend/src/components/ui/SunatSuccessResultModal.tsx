import React from "react";
import Modal from "./Modal";
import {
  CheckCircle2,
  FileText,
  FileCode,
  ShieldCheck,
  Download,
  Share2,
  ExternalLink,
  Printer,
  FileMinus2,
  FilePlus2,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface SunatSuccessResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: {
    caso?: "CASE_A" | "CASE_B" | "CASE_C" | "CASE_D" | "MANUAL_NOTE";
    message?: string;
    originalDoc?: {
      fullNumber: string;
      totalAmount: number;
      remainingAmount?: number;
      status?: string;
    };
    creditNote?: {
      fullNumber: string;
      amount: number;
      pdfUrl?: string;
      xmlUrl?: string;
      cdrUrl?: string;
    };
    debitNote?: {
      fullNumber: string;
      amount: number;
      pdfUrl?: string;
      xmlUrl?: string;
      cdrUrl?: string;
    };
    newDoc?: {
      fullNumber: string;
      totalAmount: number;
      pdfUrl?: string;
      xmlUrl?: string;
      cdrUrl?: string;
    };
  } | null;
}

export const SunatSuccessResultModal: React.FC<SunatSuccessResultModalProps> = ({
  isOpen,
  onClose,
  resultData,
}) => {
  if (!isOpen || !resultData) return null;

  const isCaseA = resultData.caso === "CASE_A";
  const note = resultData.creditNote || resultData.debitNote;

  const handleShareWhatsApp = (fullNumber: string, url?: string) => {
    const text = encodeURIComponent(
      `Estimado cliente, adjuntamos su comprobante electrónico SUNAT ${fullNumber}: ${url || window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleOpenPdf = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("El enlace al documento PDF no está disponible.");
    }
  };

  const handleDownloadXml = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("El archivo XML no está disponible.");
    }
  };

  const handleDownloadBoth = () => {
    if (resultData.creditNote?.pdfUrl) {
      window.open(resultData.creditNote.pdfUrl, "_blank");
    }
    if (resultData.newDoc?.pdfUrl) {
      setTimeout(() => {
        window.open(resultData.newDoc?.pdfUrl, "_blank");
      }, 500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="p-2 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* ENCABEZADO DE ÉXITO */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Operación Tributaria Procesada con Éxito
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                SUNAT UBL 2.1
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {resultData.message || "Los documentos fueron validados y aceptados oficialmente ante SUNAT."}
            </p>
          </div>
        </div>

        {/* TARJETAS DE RESULTADO TRIBUTARIO */}
        <div className="space-y-3">
          {/* SI FUE CASO A: NC (ANULACIÓN) + NUEVO COMPROBANTE */}
          {isCaseA && (
            <>
              {/* TARJETA 1: NOTA DE CRÉDITO DE ANULACIÓN */}
              {resultData.creditNote && (
                <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileMinus2 className="w-5 h-5 text-rose-600" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-rose-600 block">
                          Paso 1: Nota de Crédito Oficial de Anulación
                        </span>
                        <h4 className="text-sm font-black font-mono text-slate-900">
                          {resultData.creditNote.fullNumber}
                        </h4>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                      Anulación Total (Motivo 01/02)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    Anuló formalmente el comprobante anterior{" "}
                    <strong>{resultData.originalDoc?.fullNumber}</strong> por importe de S/{" "}
                    {resultData.creditNote.amount.toFixed(2)}.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {resultData.creditNote.pdfUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenPdf(resultData.creditNote?.pdfUrl)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" /> Ver PDF NC
                      </button>
                    )}
                    {resultData.creditNote.xmlUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadXml(resultData.creditNote?.xmlUrl)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <FileCode className="w-3.5 h-3.5" /> Descargar XML
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TARJETA 2: NUEVO COMPROBANTE EMITIDO */}
              {resultData.newDoc && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-600 block">
                          Paso 2: Nuevo Comprobante Válido Emitido
                        </span>
                        <h4 className="text-sm font-black font-mono text-slate-900">
                          {resultData.newDoc.fullNumber}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Importe</span>
                      <span className="text-sm font-black text-emerald-800 font-mono">
                        S/ {resultData.newDoc.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {resultData.newDoc.pdfUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenPdf(resultData.newDoc?.pdfUrl)}
                        className="px-3 py-1.5 text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir / Ver PDF
                      </button>
                    )}
                    {resultData.newDoc.xmlUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadXml(resultData.newDoc?.xmlUrl)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <FileCode className="w-3.5 h-3.5" /> XML Firmado
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleShareWhatsApp(resultData.newDoc!.fullNumber, resultData.newDoc?.pdfUrl)
                      }
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* SI FUE CASO B, C, D O NOTA MANUAL */}
          {!isCaseA && (
            <>
              {/* TARJETA 1: COMPROBANTE ORIGINAL */}
              {resultData.originalDoc && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Comprobante Principal Afectado
                    </span>
                    <h4 className="text-sm font-black font-mono text-slate-900">
                      {resultData.originalDoc.fullNumber}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Total original: S/ {resultData.originalDoc.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Vigente con Rectificación
                  </span>
                </div>
              )}

              {/* TARJETA 2: NOTA ELECTRÓNICA GENERADA */}
              {note && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {resultData.creditNote ? (
                        <FileMinus2 className="w-5 h-5 text-rose-600" />
                      ) : (
                        <FilePlus2 className="w-5 h-5 text-purple-600" />
                      )}
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-700 block">
                          {resultData.creditNote ? "Nota de Crédito Electrónica" : "Nota de Débito Electrónica"}
                        </span>
                        <h4 className="text-sm font-black font-mono text-slate-900">
                          {note.fullNumber}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Monto</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        S/ {note.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {note.pdfUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenPdf(note.pdfUrl)}
                        className="px-3 py-1.5 text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                      >
                        <Printer className="w-3.5 h-3.5" /> Ver PDF Nota
                      </button>
                    )}
                    {note.xmlUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadXml(note.xmlUrl)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <FileCode className="w-3.5 h-3.5" /> Descargar XML
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(note.fullNumber, note.pdfUrl)}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ACCIONES FINALES */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {isCaseA && resultData.creditNote?.pdfUrl && resultData.newDoc?.pdfUrl ? (
            <button
              type="button"
              onClick={handleDownloadBoth}
              className="px-4 py-2 text-xs font-black bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Descargar Ambos Comprobantes
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
