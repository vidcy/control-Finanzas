import React, { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import {
  Wand2,
  Plus,
  Trash2,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  analyzeDocumentDiff,
  getValidEmissionDateRangeForDoc,
  validateIssueDateForDoc,
  type DiffEngineResult,
} from "../../utils/fiscalUtils";

export interface SunatSmartEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    fullNumber: string;
    docType?: string; // '01', '03', 'FACTURA', 'BOLETA'
    serie?: string;
    correlative?: number;
    customerName?: string;
    customerDocType?: string;
    customerDocNum?: string;
    customerAddress?: string;
    customerEmail?: string;
    paymentMethod?: string;
    issueDate?: string | Date;
    totalAmount: number;
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

export const SunatSmartEditModal: React.FC<SunatSmartEditModalProps> = ({
  isOpen,
  onClose,
  document,
  onConfirm,
  isSubmitting = false,
}) => {
  const [clientDocType, setClientDocType] = useState("1");
  const [clientDocNumber, setClientDocNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [items, setItems] = useState<
    Array<{
      productId?: string;
      code?: string;
      name: string;
      quantity: number;
      price: number;
    }>
  >([]);

  // Rango de fechas permitido por SUNAT
  const docTypeNormalized: "01" | "03" = useMemo(() => {
    if (!document) return "03";
    const dt = String(document.docType || "").toUpperCase();
    if (dt.includes("FACTURA") || dt === "01" || document.fullNumber?.startsWith("F")) return "01";
    return "03";
  }, [document]);

  const dateLimits = useMemo(() => {
    return getValidEmissionDateRangeForDoc(docTypeNormalized);
  }, [docTypeNormalized]);

  // Inicializar estado con los valores del comprobante original
  useEffect(() => {
    if (isOpen && document) {
      setClientDocType(document.customerDocType || (docTypeNormalized === "01" ? "6" : "1"));
      setClientDocNumber(document.customerDocNum || "");
      setClientName(document.customerName || "");
      setClientAddress(document.customerAddress || "");
      setClientEmail(document.customerEmail || "");
      setPaymentMethod(document.paymentMethod || "CASH");

      let dStr = "";
      if (document.issueDate) {
        const d = new Date(document.issueDate);
        if (!isNaN(d.getTime())) {
          dStr = d.toISOString().split("T")[0];
        }
      }
      setIssueDate(dStr || dateLimits.maxDate);

      if (document.items && document.items.length > 0) {
        setItems(
          document.items.map((it) => ({
            productId: it.productId,
            code: it.code || "",
            name: it.name,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          }))
        );
      } else {
        setItems([
          {
            name: "Servicio / Producto Principal",
            quantity: 1,
            price: Number(document.totalAmount) || 0,
          },
        ]);
      }
    }
  }, [isOpen, document, docTypeNormalized, dateLimits.maxDate]);

  // Ejecución reactiva del Diff Engine en cada cambio
  const diffResult: DiffEngineResult = useMemo(() => {
    if (!document) {
      return {
        caseType: "CASE_A",
        actionTitle: "Caso A: Cambio Sustancial",
        actionExplanation: "No hay comprobante cargado.",
        reasonCode: "01",
        reasonDescription: "ANULACION DE LA OPERACION",
        diffAmount: 0,
        originalTotal: 0,
        newTotal: 0,
        noteDocType: "07",
        generatesNewInvoice: true,
        isWithin10WorkingDays: true,
      };
    }

    const origDateStr = document.issueDate
      ? new Date(document.issueDate).toISOString().split("T")[0]
      : "";

    return analyzeDocumentDiff({
      original: {
        docType: docTypeNormalized,
        series: document.serie || document.fullNumber?.split("-")[0] || "",
        number: document.correlative || Number(document.fullNumber?.split("-")[1]) || 1,
        fullNumber: document.fullNumber,
        clientDocType: document.customerDocType || "",
        clientDocNumber: document.customerDocNum || "",
        clientName: document.customerName || "",
        issueDate: origDateStr,
        currency: "PEN",
        items: (document.items || []).map((it) => ({
          code: it.code,
          description: it.name,
          quantity: it.quantity,
          unitPrice: it.price,
        })),
        totalAmount: document.totalAmount,
      },
      edited: {
        clientDocType,
        clientDocNumber,
        clientName,
        issueDate,
        currency: "PEN",
        items: items.map((it) => ({
          code: it.code,
          description: it.name,
          quantity: Number(it.quantity),
          unitPrice: Number(it.price),
        })),
      },
    });
  }, [document, docTypeNormalized, clientDocType, clientDocNumber, clientName, issueDate, items]);

  const currentTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  }, [items]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const next = [...items];
    (next[index] as any)[field] = value;
    setItems(next);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const dateCheck = validateIssueDateForDoc(issueDate, docTypeNormalized);
    if (!dateCheck.isValid) {
      alert(`Error en fecha de emisión: ${dateCheck.error}`);
      return;
    }

    if (!clientDocNumber.trim() || !clientName.trim()) {
      alert("Por favor complete los datos obligatorios del cliente.");
      return;
    }

    if (items.some((it) => !it.name.trim() || Number(it.quantity) <= 0 || Number(it.price) <= 0)) {
      alert("Todos los ítems deben tener descripción, cantidad y precio válidos.");
      return;
    }

    onConfirm({
      client_doc_type: clientDocType,
      client_doc_number: clientDocNumber.trim(),
      client_name: clientName.trim(),
      client_address: clientAddress.trim(),
      client_email: clientEmail.trim(),
      issue_date: issueDate,
      payment_method: paymentMethod,
      items: items.map((it) => ({
        productId: it.productId,
        code: it.code,
        name: it.name.trim(),
        quantity: Number(it.quantity),
        price: Number(it.price),
      })),
      diffResult,
    });
  };

  if (!isOpen || !document) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-4xl">
      <div className="p-2 space-y-5 max-h-[88vh] overflow-y-auto">
        {/* ENCABEZADO CON EFECTO PRO */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Edición Inteligente con Diff Engine (SUNAT UBL 2.1)
                </h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Modo Automático
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprobante original: <span className="font-mono font-bold text-slate-900">{document.fullNumber}</span> &bull; Monto anterior: <span className="font-mono font-bold text-slate-700">S/ {document.totalAmount.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* BANNER DINÁMICO DEL MOTOR DE DIFERENCIAS (DIFF ENGINE) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            diffResult.caseType === "CASE_A"
              ? "bg-amber-50/70 border-amber-300"
              : diffResult.caseType === "CASE_B"
              ? "bg-blue-50/70 border-blue-300"
              : diffResult.caseType === "CASE_C"
              ? "bg-purple-50/70 border-purple-300"
              : "bg-emerald-50/70 border-emerald-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                    diffResult.caseType === "CASE_A"
                      ? "bg-amber-500 text-white"
                      : diffResult.caseType === "CASE_B"
                      ? "bg-blue-600 text-white"
                      : diffResult.caseType === "CASE_C"
                      ? "bg-purple-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {diffResult.actionTitle}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium pt-1">
                {diffResult.actionExplanation}
              </p>
              {diffResult.warnings && diffResult.warnings.length > 0 && (
                <div className="text-xs text-amber-800 font-bold space-y-0.5 pt-1">
                  {diffResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Nuevo Total</span>
              <span className="text-base font-black text-slate-900 font-mono">
                S/ {currentTotal.toFixed(2)}
              </span>
              {currentTotal !== document.totalAmount && (
                <span
                  className={`text-[11px] font-bold block ${
                    currentTotal > document.totalAmount ? "text-purple-700" : "text-blue-700"
                  }`}
                >
                  {currentTotal > document.totalAmount ? "+" : ""}
                  {(currentTotal - document.totalAmount).toFixed(2)} S/
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FORMULARIO DE CABECERA: CLIENTE Y FECHA */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" /> Datos de Cabecera y Cliente
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo Doc.</label>
              <select
                value={clientDocType}
                onChange={(e) => setClientDocType(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1">1 - DNI</option>
                <option value="6">6 - RUC</option>
                <option value="4">4 - CARNET EXT.</option>
                <option value="7">7 - PASAPORTE</option>
                <option value="0">0 - SIN DOC.</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">N° Documento</label>
              <input
                type="text"
                value={clientDocNumber}
                onChange={(e) => setClientDocNumber(e.target.value)}
                placeholder="RUC / DNI"
                className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Razón Social / Nombres</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre completo o Razón Social"
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Dirección Fiscal</label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Dirección fiscal del cliente (opcional)"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Cliente</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Fecha Emisión</span>
                <span className="text-[9px] text-indigo-600 font-black">
                  Max: {dateLimits.maxCalendarDaysBack}d atrás
                </span>
              </label>
              <input
                type="date"
                min={dateLimits.minDate}
                max={dateLimits.maxDate}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* TABLA DE ÍTEMS EDITABLES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Detalle de Productos / Servicios
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Ítem
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Descripción / Producto</th>
                  <th className="py-2.5 px-3 w-24 text-center">Cant.</th>
                  <th className="py-2.5 px-3 w-28 text-right">Precio Unit.</th>
                  <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const sub = (Number(it.quantity) || 0) * (Number(it.price) || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                          placeholder="Descripción del ítem"
                          className="w-full text-xs font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none px-1 py-1"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={it.quantity}
                          onChange={(e) => handleUpdateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full text-xs text-center font-mono font-bold bg-white border border-slate-200 rounded-lg py-1 px-1 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={it.price}
                          onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                          className="w-full text-xs text-right font-mono font-bold bg-white border border-slate-200 rounded-lg py-1 px-1 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        S/ {sub.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-md transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-black rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando con Diff Engine SUNAT...
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Ejecutar Modificación Inteligente
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
