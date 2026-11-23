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
  Printer,
  MinusCircle,
  PlusCircle,
  History,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { printFiscalTicket } from "../../utils/ticketPrinter";

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
  originalDate?: string | Date;
  currentBalance?: number;
  status?: string;
  notes: NoteItemInfo[];
  user?: any;
  branch?: any;
  onEmitSubsequentNote?: (type: "CREDIT" | "DEBIT", availableBalance: number) => void;
}

export const SunatNotesListModal: React.FC<SunatNotesListModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  originalAmount,
  originalDate,
  currentBalance,
  status,
  notes,
  user,
  branch,
  onEmitSubsequentNote,
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
            if (n.docType === "CREDIT_NOTE" || n.fullNumber.includes("C")) {
              return acc - Number(n.totalAmount || 0);
            }
            if (n.docType === "DEBIT_NOTE" || n.fullNumber.includes("D")) {
              return acc + Number(n.totalAmount || 0);
            }
            return acc;
          }, originalAmount)
        );

  // Orden cronológico para la bitácora
  const sortedNotes = [...notes].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  // Calcular la bitácora de saldos paso a paso
  let runningBalance = Number(originalAmount || 0);
  const timelineEvents = sortedNotes.map((note) => {
    const isCredit = note.docType === "CREDIT_NOTE" || note.fullNumber.includes("C");
    const amount = Number(note.totalAmount || 0);
    if (isCredit) {
      runningBalance = Math.max(0, Number((runningBalance - amount).toFixed(2)));
    } else {
      runningBalance = Number((runningBalance + amount).toFixed(2));
    }
    return {
      note,
      isCredit,
      amount,
      balanceAfter: runningBalance,
    };
  });

  const handlePrintNoteTicket = (note: NoteItemInfo) => {
    const isCredit = note.docType === "CREDIT_NOTE" || note.fullNumber.includes("C");
    printFiscalTicket({
      user,
      branch,
      document: {
        docType: isCredit ? "NOTA_CREDITO" : "NOTA_DEBITO",
        serie: note.serie,
        correlative: note.correlative,
        fullNumber: note.fullNumber,
        date: note.createdAt || new Date(),
        refFullNumber: documentTitle,
        refReasonDesc: note.description ? note.description.replace(/^\[REF:[^\]]+\]\s*/i, "") : (isCredit ? "Anulación o Descuento" : "Aumento de Valor"),
        saldoRestante: effectiveBalance,
        total: Number(note.totalAmount || 0),
        totalGravada: 0,
        totalExonerada: Number(note.totalAmount || 0),
        totalInafecta: 0,
        totalIgv: 0,
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📑 Bitácora y Notas Oficiales SUNAT UBL 2.1"
      maxWidth="max-w-3xl"
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
              {originalDate && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300 mt-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Emisión inicial: {new Date(originalDate).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAnnulled ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>
                  ANULADO TOTALMENTE (N/C)
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  VIGENTE ANTE SUNAT
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Monto Original Declarado
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
                Notas Vinculadas
              </span>
              <span className="text-sm font-extrabold text-indigo-300">
                {notes.length} comprobante(s)
              </span>
            </div>
          </div>
        </div>

        {/* BITÁCORA / LÍNEA DE TIEMPO TRIBUTARIA */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Bitácora de Trazabilidad Tributaria
            </h4>
          </div>

          <div className="relative pl-5 border-l-2 border-indigo-200 space-y-3.5 ml-2">
            {/* Evento 0: Emisión Original */}
            <div className="relative">
              <div className="absolute -left-[27px] top-0.5 bg-indigo-600 text-white rounded-full p-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-900">Emisión Inicial: {documentTitle}</span>
                  <div className="text-[10px] text-slate-500 font-medium">Aceptado por SUNAT sin alteraciones iniciales</div>
                </div>
                <div className="text-right font-mono font-bold text-slate-800">
                  S/ {Number(originalAmount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Eventos 1..N: Notas emitidas */}
            {timelineEvents.map((item, idx) => (
              <div key={item.note.id || idx} className="relative">
                <div
                  className={`absolute -left-[27px] top-0.5 rounded-full p-1 shadow-xs text-white ${
                    item.isCredit ? "bg-rose-500" : "bg-emerald-600"
                  }`}
                >
                  {item.isCredit ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : (
                    <ArrowUpRight className="w-3 h-3" />
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900">
                        {item.isCredit ? "Nota de Crédito" : "Nota de Débito"} {item.note.fullNumber}
                      </span>
                      {item.note.createdAt && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({new Date(item.note.createdAt).toLocaleDateString("es-PE", { hour: "2-digit", minute: "2-digit" })})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 max-w-md truncate" title={item.note.description}>
                      {item.note.description?.replace(/^\[REF:[^\]]+\]\s*/i, "") || "Modificación oficial"}
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <span
                      className={`font-mono font-extrabold ${
                        item.isCredit ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {item.isCredit ? "- S/ " : "+ S/ "}
                      {item.amount.toFixed(2)}
                    </span>
                    <div className="text-[9.5px] font-mono text-slate-500">
                      Saldo restante: <strong>S/ {item.balanceAfter.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACCIONES PARA EMITIR NOTAS SUBSIGUIENTES CON SALDO */}
        {onEmitSubsequentNote && (
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-black text-indigo-950 block">
                {effectiveBalance > 0
                  ? `Saldo Disponible para Ajustes: S/ ${effectiveBalance.toFixed(2)}`
                  : "Comprobante sin saldo disponible (Anulado o Descontado al 100%)"}
              </span>
              <p className="text-[10px] text-indigo-800">
                {effectiveBalance > 0
                  ? "Puedes emitir una nota de crédito adicional para seguir disminuyendo/anular el saldo, o nota de débito para aumentar valor."
                  : "SUNAT no admite notas de crédito sobre comprobantes con saldo agotado."}
              </p>
            </div>

            {effectiveBalance > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onEmitSubsequentNote("CREDIT", effectiveBalance)}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Emitir Nota de Crédito por el saldo restante o diferencia"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Emitir N. Crédito</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEmitSubsequentNote("DEBIT", effectiveBalance)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Emitir Nota de Débito para incrementar valor o cobrar diferencia"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Emitir N. Débito</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* LISTA DETALLADA DE NOTAS */}
        <div className="space-y-2.5 max-h-[38vh] overflow-y-auto custom-scrollbar pr-1">
          {notes.length === 0 ? (
            <div className="p-6 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
              <p className="text-xs font-bold text-slate-600">
                No se registran notas emitidas para este comprobante.
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
                  className="p-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* BOTÓN IMPRIMIR TICKET 80MM */}
                      <button
                        type="button"
                        onClick={() => handlePrintNoteTicket(note)}
                        className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Imprimir Ticket Térmico 80mm de la Nota"
                      >
                        <Printer className="w-3 h-3 text-indigo-600" />
                        <span>Ticket</span>
                      </button>

                      {note.pdfUrl ? (
                        <a
                          href={note.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border border-slate-200"
                          title="Ver PDF A4 Oficial"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <a
                          href={`http://localhost:4001/api/v1/documents/by-series-number/${note.serie}/${note.correlative}/html?format=A4`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border border-slate-200"
                          title="Ver PDF A4 Oficial"
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
