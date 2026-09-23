/**
 * Utilidades para compartir cotizaciones, tickets de venta, ofertas y recordatorios
 * directamente mediante WhatsApp API (wa.me) con formato profesional enriquecido.
 */

export interface SaleWhatsAppPayload {
  txId?: string;
  billingType?: string;
  billingSerie?: string;
  billingNumber?: string | number;
  items: Array<{
    name: string;
    quantity: number;
    salePrice: number;
    unit?: string;
  }>;
  total: number;
  paymentMethod?: string;
  clientDenomination?: string;
  clientDocumentNumber?: string;
  date?: Date | string;
  businessName?: string;
}

export function formatCurrency(amount: number): string {
  return `S/ ${Number(amount || 0).toFixed(2)}`;
}

/**
 * Genera y abre el enlace de WhatsApp con el comprobante / ticket de venta.
 */
export function shareSaleReceiptViaWhatsApp(sale: SaleWhatsAppPayload, phone: string = ""): void {
  const dateStr = sale.date
    ? new Date(sale.date).toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

  const client = (sale.clientDenomination || "CLIENTES VARIOS").trim();
  const ticketRef = sale.billingSerie
    ? `${sale.billingSerie}-${String(sale.billingNumber || "").padStart(6, "0")}`
    : (sale.txId ? String(sale.txId).slice(-8).toUpperCase() : `VTA-${Date.now().toString().slice(-6)}`);

  const business = (sale.businessName || "CONTROL & FINANZAS").trim();

  let msg = `🛍️ *COMPROBANTE DE VENTA ELECTRÓNICO*\n`;
  msg += `🏢 *${business}*\n`;
  msg += `📅 *Fecha:* ${dateStr}\n`;
  msg += `👤 *Cliente:* ${client}\n`;
  if (sale.clientDocumentNumber) {
    msg += `📄 *Doc:* ${sale.clientDocumentNumber}\n`;
  }
  msg += `🧾 *Comprobante N°:* ${ticketRef}\n`;
  msg += `💳 *Método de Pago:* ${sale.paymentMethod || "Efectivo / Transferencia"}\n`;
  msg += `─────────────────────────\n`;
  msg += `*DETALLE DE PRODUCTOS:*\n`;

  sale.items.forEach((item, index) => {
    const subtotal = Number(item.quantity) * Number(item.salePrice);
    msg += `${index + 1}. *${item.name}*\n`;
    msg += `   ${item.quantity} und. x ${formatCurrency(item.salePrice)} = *${formatCurrency(subtotal)}*\n`;
  });

  msg += `─────────────────────────\n`;
  msg += `💰 *TOTAL A PAGAR:* *${formatCurrency(sale.total)}*\n\n`;
  msg += `✨ *¡Muchas gracias por su compra y preferencia!* ✨\n`;
  msg += `_Este mensaje es una constancia de emisión generada automáticamente._`;

  const cleanPhone = phone.replace(/\D/g, "");
  const target = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(target, "_blank", "noopener,noreferrer");
}

/**
 * Genera y abre el enlace de WhatsApp promocionando un producto o serie de calzados.
 */
export function shareProductOfferViaWhatsApp(
  product: any,
  availableSizes?: string[],
  customPhone: string = ""
): void {
  const name = product.name || "Producto";
  const hasOffer = Boolean(product.adjustedPrice && Number(product.adjustedPrice) > 0);
  const regularPrice = Number(product.salePrice || 0);
  const promoPrice = hasOffer ? Number(product.adjustedPrice) : regularPrice;

  let msg = `✨ *¡NOVEDAD EN NUESTRO CATÁLOGO!* ✨\n\n`;
  msg += `👟 *${name.toUpperCase()}*\n`;

  if (product.brand?.name || product.brand) {
    msg += `🏷️ *Marca:* ${product.brand?.name || product.brand}\n`;
  }

  if (hasOffer && regularPrice > promoPrice) {
    const discountPct = Math.round(((regularPrice - promoPrice) / regularPrice) * 100);
    msg += `🔥 *PRECIO DE OFERTA:* *${formatCurrency(promoPrice)}* ` +
           `~(${formatCurrency(regularPrice)})~ ¡-${discountPct}% OFF!\n`;
  } else {
    msg += `💵 *Precio:* *${formatCurrency(regularPrice)}*\n`;
  }

  if (availableSizes && availableSizes.length > 0) {
    msg += `📏 *Tallas disponibles:* ${availableSizes.join(", ")}\n`;
  }

  if (product.stock !== undefined && product.stock > 0) {
    msg += `📦 *Disponibilidad:* Stock disponible para entrega inmediata\n`;
  }

  if (product.description) {
    const cleanDesc = product.description.replace(/\[SERIE:[\s\S]*?\]/g, "").trim();
    if (cleanDesc) {
      msg += `📝 *Detalles:* ${cleanDesc}\n`;
    }
  }

  msg += `\n💬 *¿Deseas separar tu pedido o consultar disponibilidad?*\n`;
  msg += `Respóndenos a este mensaje para reservarlo ahora mismo. 🚀`;

  const cleanPhone = customPhone.replace(/\D/g, "");
  const target = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(target, "_blank", "noopener,noreferrer");
}

/**
 * Recordatorio de deuda o pago pendiente por WhatsApp.
 */
export function sharePaymentReminderViaWhatsApp(
  clientName: string,
  concept: string,
  amount: number,
  dueDate?: string,
  customPhone: string = ""
): void {
  let msg = `👋 *Hola ${clientName.trim()}, le saludamos cordialmente.*\n\n`;
  msg += `Le recordamos que mantiene un saldo pendiente por concepto de:\n`;
  msg += `📌 *Concepto:* ${concept}\n`;
  msg += `💰 *Monto Pendiente:* *${formatCurrency(amount)}*\n`;
  if (dueDate) {
    msg += `📅 *Fecha sugerida / límite:* ${dueDate}\n`;
  }
  msg += `\nLe agradecemos su compromiso para coordinar la cancelación. Si ya realizó el pago, por favor ignore este mensaje.\n\n`;
  msg += `¡Que tenga un excelente día! 🙌`;

  const cleanPhone = customPhone.replace(/\D/g, "");
  const target = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(target, "_blank", "noopener,noreferrer");
}
