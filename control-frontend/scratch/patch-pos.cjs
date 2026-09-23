const fs = require('fs');
const path = require('path');

const posPath = path.join(__dirname, '..', 'src', 'pages', 'BusinessPosPage.tsx');
let code = fs.readFileSync(posPath, 'utf8');

// 1. Ensure QRCode and getBranchesRequest are imported
if (!code.includes('import QRCode from "qrcode";')) {
  code = `import QRCode from "qrcode";\nimport { getBranchesRequest, type Branch } from "../services/branch.api";\n` + code;
  console.log("Added QRCode and getBranchesRequest imports");
}

// 2. Add branches state
if (!code.includes('const [branches, setBranches] = useState<Branch[]>([]);')) {
  code = code.replace(
    '  const [activeShift, setActiveShift] = useState<any>(null);',
    '  const [activeShift, setActiveShift] = useState<any>(null);\n  const [branches, setBranches] = useState<Branch[]>([]);'
  );
  console.log("Added branches state in BusinessPosPage");
}

// 3. Load branches in loadData
const loadDataTarget = `const [prods, cats, shiftRes, advisorsList] = await Promise.all([
        getProductsRequest(),
        listCategoriesRequest(),
        getActiveCashShiftRequest().catch(() => null),
        getAdvisorsRequest({ isActive: true }).catch(() => []),
      ]);`;

const newLoadDataTarget = `const [prods, cats, shiftRes, advisorsList, branchesList] = await Promise.all([
        getProductsRequest(),
        listCategoriesRequest(),
        getActiveCashShiftRequest().catch(() => null),
        getAdvisorsRequest({ isActive: true }).catch(() => []),
        getBranchesRequest().catch(() => []),
      ]);
      setBranches(branchesList);`;

if (code.includes(loadDataTarget)) {
  code = code.replace(loadDataTarget, newLoadDataTarget);
  console.log("Updated loadData to fetch branches");
}

// 4. Update printTicket with logo, local address, itemized list, and thermal QR code
const oldPrintTicketRegex = /const printTicket = \(\) => \{[\s\S]*?const printWin = window\.open\([\s\S]*?printWin\.print\(\);[\s\S]*?iframe\.remove\(\);\s*\}, 1000\);\s*\}\s*catch \(e\) \{[\s\S]*?\}\s*\};\s*printThermal\(\);\s*\};/;

const newPrintTicket = `const printTicket = async () => {
    if (!lastSale) {
      window.print();
      return;
    }

    const businessName = user?.businessName ? user.businessName.toUpperCase() : "THINK";
    const businessReason = user?.businessReason ? \`Razón Social: \${user.businessReason}<br/>\` : "";
    const businessRuc = user?.businessRuc ? \`RUC: \${user.businessRuc}<br/>\` : "";
    const businessRubro = user?.businessRubro ? \`Giro: \${user.businessRubro}<br/>\` : "";

    const activeBranch = branches.find((b) => b.id === activeShift?.branchId);
    const branchAddress = activeBranch?.address || activeShift?.branch?.address || user?.businessAddress || user?.address || "";
    const branchName = activeBranch?.name || activeShift?.branch?.name || "";
    const addressHtml = branchAddress
      ? \`<div style="font-size: 10px; margin-top: 2px;">Dirección: \${branchAddress} \${branchName ? \`(\${branchName})\` : ""}</div>\`
      : (branchName ? \`<div style="font-size: 10px; margin-top: 2px;">Local / Sede: \${branchName}</div>\` : "");

    const logoUrl = user?.businessLogo ? getReceiptAbsoluteUrl(user.businessLogo) : null;
    const logoHtml = logoUrl
      ? \`<div style="text-align: center; margin-bottom: 6px;"><img src="\${logoUrl}" style="max-height: 52px; max-width: 150px; object-fit: contain; margin: 0 auto; display: block;" /></div>\`
      : "";

    const compType =
      lastSale.billingType === "BOLETA"
        ? "BOLETA DE VENTA ELECTRÓNICA"
        : lastSale.billingType === "FACTURA"
          ? "FACTURA ELECTRÓNICA"
          : lastSale.billingType === "NOTA_CREDITO"
            ? "NOTA DE CRÉDITO ELECTRÓNICA"
            : lastSale.billingType === "NOTA_DEBITO"
              ? "NOTA DE DÉBITO ELECTRÓNICA"
              : "TICKET DE VENTA";

    const dateStr = format(lastSale.date, "dd/MM/yyyy HH:mm");
    const numComp =
      lastSale.billingSerie && lastSale.billingNumber
        ? \`\${lastSale.billingSerie}-\${lastSale.billingNumber}\`
        : (lastSale.txId?.slice(0, 8) || "0000").toUpperCase();
    const payStr = paymentLabel[lastSale.paymentMethod] || lastSale.paymentMethod;

    // Generate SUNAT QR Code Data URL
    const rucVal = user?.businessRuc || "20000000000";
    const compCodeVal = lastSale.billingType === "FACTURA" ? "01" : lastSale.billingType === "BOLETA" ? "03" : "00";
    const serieVal = lastSale.billingSerie || "T001";
    const numVal = lastSale.billingNumber ? String(lastSale.billingNumber) : (lastSale.txId?.slice(0, 8) || "000001");
    const igvVal = (lastSale.total - lastSale.total / 1.18).toFixed(2);
    const totalVal = Number(lastSale.total).toFixed(2);
    const fechaVal = format(lastSale.date, "yyyy-MM-dd");
    const docTypeVal = lastSale.clientDocumentType || "-";
    const docNumVal = lastSale.clientDocumentNumber || "-";
    const qrText = \`\${rucVal}|\${compCodeVal}|\${serieVal}|\${numVal}|\${igvVal}|\${totalVal}|\${fechaVal}|\${docTypeVal}|\${docNumVal}|\`;

    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(qrText, {
        width: 130,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    } catch (e) {
      console.warn("Error generating thermal QR:", e);
    }

    const qrHtml = qrDataUrl
      ? \`<div style="text-align: center; margin: 8px auto 4px auto;">
          <img src="\${qrDataUrl}" style="width: 115px; height: 115px; display: block; margin: 0 auto; image-rendering: pixelated;" />
          <div style="font-size: 8px; font-weight: bold; margin-top: 3px; letter-spacing: 0.5px;">CÓDIGO DE CONTROL FISCAL</div>
         </div>\`
      : "";

    const itemsHtml = lastSale.items
      .map((item: any) => {
        const pres = item.presentations?.find((p: any) => p.id === item.presentationId);
        const presName = pres ? pres.name : item.unit;
        const sub = (item.quantity * item.salePrice).toFixed(2);
        return \`
          <tr>
            <td style="padding: 3px 0; vertical-align: top; font-weight: bold; width: 24px;">\${item.quantity}x</td>
            <td style="padding: 3px 4px; vertical-align: top;">\${item.name} [\${presName}]</td>
            <td style="padding: 3px 0; vertical-align: top; text-align: right; font-weight: bold; white-space: nowrap;">S/ \${sub}</td>
          </tr>
        \`;
      })
      .join("");

    const clientHtml = lastSale.clientDocumentNumber
      ? \`
        <div style="border-top: 1px dashed #000000; margin: 5px 0; padding-top: 4px; font-size: 10px;">
          <div><strong>Cliente:</strong> \${lastSale.clientDenomination || ""}</div>
          <div><strong>\${lastSale.clientDocumentType === "6" ? "RUC" : "DNI"}:</strong> \${lastSale.clientDocumentNumber}</div>
          \${lastSale.clientAddress ? \`<div><strong>Dir:</strong> \${lastSale.clientAddress}</div>\` : ""}
        </div>
      \`
      : "";

    const cashHtml =
      lastSale.paymentMethod === "CASH"
        ? \`
        <div style="border-top: 1px dashed #000000; margin: 5px 0; padding-top: 5px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Efectivo Recibido:</span>
            <span style="font-weight: bold;">S/ \${(lastSale.amountPaid || lastSale.total).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 2px;">
            <span>Vuelto:</span>
            <span>S/ \${(lastSale.changeDue || 0).toFixed(2)}</span>
          </div>
        </div>
      \`
        : "";

    const ticketHtml = \`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket_\${numComp}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              color: #000000 !important;
              background: transparent !important;
            }
            html, body {
              width: 80mm;
              margin: 0 auto;
              padding: 4mm 3mm;
              background: #ffffff !important;
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              line-height: 1.3;
              -webkit-font-smoothing: none !important;
              text-rendering: geometricPrecision;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000000; margin: 6px 0; }
            .double-line { border-top: 2px solid #000000; margin: 7px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center">
            \${logoHtml}
            <div class="bold" style="font-size: 15px; letter-spacing: 0.5px;">\${businessName}</div>
            <div style="font-size: 10px; margin-top: 2px;">
              \${businessReason}
              \${businessRuc}
              \${businessRubro}
              \${addressHtml}
            </div>
            <div class="bold" style="margin-top: 5px; font-size: 12px;">\${compType}</div>
          </div>
          <div class="line"></div>
          <div class="flex-between">
            <span>Fecha:</span>
            <span>\${dateStr}</span>
          </div>
          <div class="flex-between">
            <span>\${lastSale.billingType && lastSale.billingType !== "TICKET_VENTA" ? "Comprobante:" : "Ticket #:"}</span>
            <span class="bold">\${numComp}</span>
          </div>
          <div class="flex-between">
            <span>Pago:</span>
            <span>\${payStr}</span>
          </div>
          \${clientHtml}
          <div class="line"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000000;">
                <th style="text-align: left; width: 24px; padding-bottom: 3px;">CT</th>
                <th style="text-align: left; padding-bottom: 3px;">DESCRIPCIÓN</th>
                <th style="text-align: right; width: 70px; padding-bottom: 3px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              \${itemsHtml}
            </tbody>
          </table>
          <div class="double-line"></div>
          <div class="flex-between bold" style="font-size: 14px;">
            <span>TOTAL A PAGAR:</span>
            <span>S/ \${lastSale.total.toFixed(2)}</span>
          </div>
          \${cashHtml}
          \${qrHtml}
          <div class="line"></div>
          <div class="center" style="font-size: 10px; margin-top: 6px;">
            <div class="bold">¡Gracias por su preferencia!</div>
            \${(!lastSale?.billingType || lastSale.billingType === "TICKET_VENTA") ? '<div style="font-size: 9px; margin-top: 2px;">Solicita tu Boleta o Factura</div>' : ''}
            <div style="font-size: 9.5px; font-weight: bold; margin-top: 6px;">Corporación Ccoplex - THINK ERP</div>
          </div>
        </body>
      </html>
    \`;

    const printWin = window.open("", "_blank", "width=380,height=650,menubar=no,toolbar=no,location=no,status=no");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(ticketHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        try {
          printWin.print();
          setTimeout(() => {
            try { printWin.close(); } catch (_) { }
          }, 1000);
        } catch (e) {
          console.error("Popup print error:", e);
        }
      }, 350);
      return;
    }

    try {
      const oldIframe = document.getElementById("thermal-receipt-iframe");
      if (oldIframe) oldIframe.remove();
      const iframe = document.createElement("iframe");
      iframe.id = "thermal-receipt-iframe";
      iframe.style.position = "fixed";
      iframe.style.left = "0";
      iframe.style.top = "0";
      iframe.style.width = "80mm";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.zIndex = "-9999";
      iframe.style.opacity = "0.01";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(ticketHtml);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Iframe print error:", e);
          } finally {
            setTimeout(() => {
              iframe.remove();
            }, 1000);
          }
        }, 350);
      }
    } catch (e) {
      console.error("Print thermal error:", e);
      window.print();
    }
  };`;

if (oldPrintTicketRegex.test(code)) {
  code = code.replace(oldPrintTicketRegex, newPrintTicket);
  console.log("Replaced printTicket with full 80mm thermal receipt, logo, address, and QR!");
} else {
  console.log("oldPrintTicketRegex did not match directly");
}

fs.writeFileSync(posPath, code, 'utf8');
console.log("BusinessPosPage patched!");
