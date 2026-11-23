import QRCode from "qrcode";
import { format } from "date-fns";

export interface TicketPrintDocument {
  docType: "BOLETA" | "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "TICKET_VENTA" | string;
  serie: string;
  correlative: number | string;
  fullNumber?: string;
  date: Date | string;
  paymentMethod?: string;
  amountPaid?: number;
  changeDue?: number;
  clientDocumentType?: string;
  clientDocumentNumber?: string;
  clientDenomination?: string;
  clientAddress?: string | null;
  // Para Notas de Crédito / Débito:
  refDocumentType?: string;
  refFullNumber?: string;
  refReasonCode?: string;
  refReasonDesc?: string;
  saldoRestante?: number;
  items?: Array<{
    quantity: number;
    name: string;
    unit?: string;
    salePrice: number;
    sku?: string;
  }>;
  total: number;
  totalGravada?: number;
  totalExonerada?: number;
  totalInafecta?: number;
  totalIgv?: number;
  igvRate?: number;
  hash?: string | null;
}

export interface TicketPrintOptions {
  user?: any;
  branch?: any;
  document: TicketPrintDocument;
}

export const printFiscalTicket = async ({
  user,
  branch,
  document,
}: TicketPrintOptions): Promise<void> => {
  const isCredit =
    document.docType === "NOTA_CREDITO" ||
    document.docType === "CREDIT_NOTE" ||
    document.serie?.startsWith("BC") ||
    document.serie?.startsWith("FC");
  const isDebit =
    document.docType === "NOTA_DEBITO" ||
    document.docType === "DEBIT_NOTE" ||
    document.serie?.startsWith("BD") ||
    document.serie?.startsWith("FD");
  const isInvoice =
    document.docType === "FACTURA" ||
    document.docType === "INVOICE" ||
    document.serie?.startsWith("F");
  const isBoleta =
    document.docType === "BOLETA" ||
    document.serie?.startsWith("B");
  const isFiscal = isInvoice || isBoleta || isCredit || isDebit;

  const docDate = document.date instanceof Date ? document.date : new Date(document.date || Date.now());
  const formattedCorrelative = String(document.correlative || 1).padStart(8, "0");
  const numComp = document.fullNumber || `${document.serie}-${formattedCorrelative}`;

  const compTitle = isCredit
    ? "NOTA DE CRÉDITO ELECTRÓNICA"
    : isDebit
    ? "NOTA DE DÉBITO ELECTRÓNICA"
    : isInvoice
    ? "FACTURA ELECTRÓNICA"
    : isBoleta
    ? "BOLETA DE VENTA ELECTRÓNICA"
    : "NOTA DE VENTA";

  const businessName = (user?.businessName || user?.businessReason || "EMPRESA PRINCIPAL").toUpperCase();
  const businessRuc = user?.businessRuc ? `RUC: ${user.businessRuc}<br/>` : "";
  const businessReason = user?.businessReason && user.businessReason !== user.businessName ? `Razón Social: ${user.businessReason}<br/>` : "";
  const businessAddress = branch?.address || user?.businessAddress || "";
  const businessPhone = branch?.phone || user?.businessPhone || "";
  const branchName = branch?.name || "";

  // Generar QR oficial SUNAT
  let qrDataUrl = "";
  if (isFiscal) {
    try {
      const sunatDocCode = isCredit ? "07" : isDebit ? "08" : isInvoice ? "01" : "03";
      const totalAmount = Number(document.total || 0).toFixed(2);
      const igvAmount = Number(document.totalIgv || 0).toFixed(2);
      const dateFormatted = format(docDate, "yyyy-MM-dd");
      const clientDocType = document.clientDocumentType || (isInvoice ? "6" : "1");
      const clientDocNum = document.clientDocumentNumber || "00000000";
      const hashStr = document.hash || "VALIDADO-SUNAT";

      const qrPayload = [
        user?.businessRuc || "20000000001",
        sunatDocCode,
        document.serie,
        formattedCorrelative,
        igvAmount,
        totalAmount,
        dateFormatted,
        clientDocType,
        clientDocNum,
        hashStr,
      ].join("|");

      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 130,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    } catch (e) {
      console.warn("[ticketPrinter] QR generation error:", e);
    }
  }

  const items = document.items && document.items.length > 0 ? document.items : [];
  const itemsHtml =
    items.length > 0
      ? items
          .map((item) => {
            const sub = (Number(item.quantity || 1) * Number(item.salePrice || 0)).toFixed(2);
            return `
              <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 3px 0; vertical-align: top; font-weight: bold; width: 24px;">${item.quantity}x</td>
                <td style="padding: 3px 4px; vertical-align: top;">
                  ${item.sku ? `<span style="font-size: 8px; color: #555;">SKU: ${item.sku}</span><br/>` : ""}
                  <strong>${item.name}</strong> ${item.unit ? `[${item.unit}]` : ""}
                </td>
                <td style="padding: 3px 0; vertical-align: top; text-align: right; font-weight: bold; white-space: nowrap;">S/ ${sub}</td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr style="border-bottom: 1px dotted #ccc;">
          <td style="padding: 3px 0; vertical-align: top; font-weight: bold; width: 24px;">1x</td>
          <td style="padding: 3px 4px; vertical-align: top;">
            <strong>${document.refReasonDesc || "Ajuste de operación"}</strong>
          </td>
          <td style="padding: 3px 0; vertical-align: top; text-align: right; font-weight: bold; white-space: nowrap;">S/ ${Number(document.total || 0).toFixed(2)}</td>
        </tr>
      `;

  const clientHtml = document.clientDocumentNumber
    ? `
      <div style="border-top: 1px dashed #000; margin: 4px 0; padding-top: 4px; font-size: 10px;">
        <div><strong>Cliente:</strong> ${document.clientDenomination || "CLIENTES VARIOS"}</div>
        <div><strong>${document.clientDocumentType === "6" ? "RUC" : "DNI/Doc"}:</strong> ${document.clientDocumentNumber}</div>
        ${document.clientAddress ? `<div><strong>Dir:</strong> ${document.clientAddress}</div>` : ""}
      </div>
    `
    : "";

  const refNoteHtml =
    isCredit || isDebit
      ? `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px; margin: 5px 0; font-size: 10px;">
          <div style="font-weight: bold; color: #0f172a;">DOC. QUE MODIFICA:</div>
          <div style="font-size: 11px; font-weight: bold; color: #1e293b;">
            ${document.refFullNumber ? document.refFullNumber : "Comprobante Original"}
          </div>
          <div style="margin-top: 3px; font-size: 9.5px; color: #475569;">
            <strong>Motivo SUNAT:</strong> ${document.refReasonDesc || "Modificación oficial conforme a normativa"}
          </div>
        </div>
      `
      : "";

  const ticketHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${numComp}</title>
        <style>
          @page { size: 80mm auto; margin: 0mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; color: #000000 !important; background: transparent !important; }
          html, body {
            width: 76mm;
            margin: 0 auto;
            padding: 4mm 2.5mm;
            background: #ffffff !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            font-size: 11px;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000000; margin: 5px 0; }
          .double-line { border-top: 2px solid #000000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          .flex-between { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: 13.5px; letter-spacing: 0.5px;">${businessName}</div>
          <div style="font-size: 9.5px; margin-top: 2px;">
            ${businessReason}
            ${businessRuc}
            ${branchName ? `<div><strong>Sede:</strong> ${branchName}</div>` : ""}
            ${businessAddress ? `<div><strong>Dir:</strong> ${businessAddress}</div>` : ""}
            ${businessPhone ? `<div><strong>Tel:</strong> ${businessPhone}</div>` : ""}
          </div>
          <div class="bold" style="margin-top: 5px; font-size: 11.5px; letter-spacing: 0.3px;">${compTitle}</div>
        </div>

        <div class="line"></div>

        <div class="flex-between">
          <span>Fecha Emisión:</span>
          <span>${format(docDate, "dd/MM/yyyy HH:mm")}</span>
        </div>
        <div class="flex-between">
          <span>Número:</span>
          <span class="bold">${numComp}</span>
        </div>
        ${document.paymentMethod ? `
          <div class="flex-between">
            <span>Forma de Pago:</span>
            <span>${document.paymentMethod}</span>
          </div>
        ` : ""}

        ${refNoteHtml}
        ${clientHtml}

        <div class="line"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; width: 24px; padding-bottom: 2px;">CANT</th>
              <th style="text-align: left; padding-bottom: 2px;">DESCRIPCIÓN</th>
              <th style="text-align: right; width: 65px; padding-bottom: 2px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="double-line"></div>

        <div style="font-size: 10px; line-height: 1.4; margin-bottom: 4px;">
          ${Number(document.totalGravada || 0) > 0 ? `
            <div class="flex-between">
              <span>OP. GRAVADA:</span>
              <span>S/ ${Number(document.totalGravada).toFixed(2)}</span>
            </div>
            <div class="flex-between">
              <span>I.G.V. (${(document.igvRate || 18).toFixed(2)}%):</span>
              <span>S/ ${Number(document.totalIgv || 0).toFixed(2)}</span>
            </div>
          ` : Number(document.totalInafecta || 0) > 0 ? `
            <div class="flex-between">
              <span>OP. INAFECTA:</span>
              <span>S/ ${Number(document.totalInafecta).toFixed(2)}</span>
            </div>
          ` : Number(document.totalExonerada || 0) > 0 ? `
            <div class="flex-between">
              <span>OP. EXONERADA:</span>
              <span>S/ ${Number(document.totalExonerada).toFixed(2)}</span>
            </div>
          ` : ""}

          <div class="flex-between bold" style="font-size: 13.5px; margin-top: 3px; border-top: 1px solid #000; padding-top: 2px;">
            <span>${isCredit ? "TOTAL NOTA CRÉDITO:" : isDebit ? "TOTAL NOTA DÉBITO:" : "TOTAL A PAGAR:"}</span>
            <span>${isCredit ? "- S/ " : isDebit ? "+ S/ " : "S/ "}${Number(document.total || 0).toFixed(2)}</span>
          </div>

          ${document.saldoRestante !== undefined ? `
            <div class="flex-between bold" style="font-size: 11px; margin-top: 4px; background: #f1f5f9; padding: 3px 4px; border-radius: 3px;">
              <span>SALDO VIGENTE DEL COMPROBANTE:</span>
              <span>S/ ${Number(document.saldoRestante).toFixed(2)}</span>
            </div>
          ` : ""}
        </div>

        ${qrDataUrl ? `
          <div class="center" style="margin-top: 8px;">
            <img src="${qrDataUrl}" style="width: 105px; height: 105px; margin: 0 auto; display: block;" />
            <div style="font-size: 8px; color: #222; margin-top: 3px; font-family: monospace;">
              ${document.hash ? `Hash: ${document.hash}<br/>` : ""}
              Representación impresa autorizada de la ${compTitle}<br/>
              Consulte su validez en el portal oficial de SUNAT
            </div>
          </div>
        ` : ""}

        <div class="line"></div>
        <div class="center" style="font-size: 9px; margin-top: 5px;">
          <div>¡Gracias por su preferencia!</div>
          <div style="font-weight: bold; margin-top: 2px;">SISTEMA CONTROL FINANZAS ERP</div>
        </div>
      </body>
    </html>
  `;

  const printWin = window.open("", "_blank", "width=380,height=600,menubar=no,toolbar=no,location=no,status=no");
  if (printWin) {
    printWin.document.open();
    printWin.document.write(ticketHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      try {
        printWin.print();
        setTimeout(() => {
          try {
            printWin.close();
          } catch (_) {}
        }, 1000);
      } catch (e) {
        console.error("[ticketPrinter] print error:", e);
      }
    }, 450);
  }
};
