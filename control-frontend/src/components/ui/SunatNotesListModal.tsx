import React from "react";
import Modal from "./Modal";
import {
  FileText,
  FileCode,
  FileCheck,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from "lucide-react";

export interface NoteItemInfo {
  id: string;
  docType: string;
  serie: string;
  correlative: number;
  fullNumber: string;
  totalAmount: number;
  status: string;
  description?: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  cdrUrl?: string | null;
  createdAt?: string | Date;
}

interface SunatNotesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string; // ej: "Boleta de Venta B001-00000027"
  originalAmount: number;
  currentBalance?: number;
  status?: string;
  notes: NoteItemInfo[];
}

export const SunatNotesListModal: React.FC<SunatNotesListModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  originalAmount,
  currentBalance,
  status,
  notes,
}) => {
  const isAnnulled =
    status === "CANCELLED" ||
    notes.some(
      (n) =>
        n.docType === "CREDIT_NOTE" &&
        (n.description?.toUpperCase().includes("ANULACION") ||
          Number(n.totalAmount) >= Number(originalAmount) - 0.01)
    );

  const effectiveBalance =
    currentBalance !== undefined
      ? currentBalance
      : isAnnulled
      ? 0
      : Math.max(
          0,
          notes.reduce((acc, n) => {
            if (n.docType === "CREDIT_NOTE") return acc - Number(n.totalAmount || 0);
            if (n.docType === "DEBIT_NOTE") return acc + Number(n.totalAmount || 0);
            return acc;
          }, originalAmount)
        );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📑 Notas de Crédito y Débito Oficiales SUNAT"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Cabecera Informativa del Comprobante Principal */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                  Comprobante Referenciado
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5">{documentTitle}</h3>
            </div>

            <div className="flex items-center gap-2">
              {isAnnulled ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>
                  ANULADO POR NOTA DE CRÉDITO
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  VIGENTE CON AJUSTES
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Monto Original
              </span>
              <span className="text-sm font-mono font-bold text-slate-200">
                S/ {Number(originalAmount || 0).toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Saldo Activo SUNAT
              </span>
              <span
                className={`text-sm font-mono font-black ${
                  isAnnulled
                    ? "text-rose-400 line-through"
                    : "text-emerald-400 font-extrabold text-base"
                }`}
              >
                S/ {Number(effectiveBalance).toFixed(2)}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Notas Emitidas
              </span>
              <span className="text-sm font-extrabold text-indigo-300">
                {notes.length} comprobante(s)
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Notas */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
          {notes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-bold text-slate-600">
                No se registran notas de crédito ni débito para este comprobante.
              </p>
            </div>
          ) : (
            notes.map((note) => {
              const isCredit = note.docType === "CREDIT_NOTE" || note.fullNumber.includes("C");
              const cleanDesc = note.description
                ? note.description.replace(/^\[REF:[^\]]+\]\s*/i, "")
                : isCredit
                ? "Ajuste o Descuento de Valor"
                : "Aumento en el Valor";

              return (
                <div
                  key={note.id || note.fullNumber}
                  className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase flex items-center gap-1 ${
                          isCredit
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownRight className="w-3 h-3 text-rose-600" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                        )}
                        {isCredit ? "Nota de Crédito" : "Nota de Débito"}
                      </span>

                      <span className="font-mono font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {note.fullNumber}
                      </span>

                      {note.status === "ACCEPTED" && (
                        <span className="text-[9px] font-extrabold bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded">
                          Aceptada SUNAT
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-700 truncate" title={cleanDesc}>
                      {cleanDesc}
                    </p>

                    {note.createdAt && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(note.createdAt).toLocaleDateString("es-PE", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div
                      className={`text-sm font-mono font-black ${
                        isCredit ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isCredit ? "- S/ " : "+ S/ "}
                      {Number(note.totalAmount || 0).toFixed(2)}
                    </div>

                    {/* Descargas y Visualización */}
                    <div className="flex items-center gap-1.5">
                      {note.pdfUrl ? (
                        <a
                          href={note.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Ver PDF Oficial"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <a
                          href={`http://localhost:4001/api/v1/documents/by-series-number/${note.serie}/${note.correlative}/html?format=A4`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Ver PDF Oficial"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      )}

                      {note.xmlUrl && (
                        <a
                          href={note.xmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Ver XML Firmado"
                        >
                          <FileCode className="w-3 h-3" />
                          <span>XML</span>
                        </a>
                      )}

                      {note.cdrUrl && (
                        <a
                          href={note.cdrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Ver Constancia CDR SUNAT"
                        >
                          <FileCheck className="w-3 h-3" />
                          <span>CDR</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Validez tributaria sincronizada con SUNAT UBL 2.1</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
