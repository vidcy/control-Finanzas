import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  CreditCard,
  Tag,
  ExternalLink,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import { createLeadRequest } from "../../services/lead.api";
import type { GroupedShoeModel } from "../veaz/veazTypes";

interface StoreVirtualChatWidgetProps {
  storeName: string;
  storeId?: string;
  storeSlug?: string;
  whatsappPhone: string;
  rubro?: string;
  products?: GroupedShoeModel[];
  onOpenProductModal?: (product: GroupedShoeModel) => void;
  externalIsOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  actionCard?: "booking" | "whatsapp" | "shipping" | "products";
  suggestedProducts?: GroupedShoeModel[];
}

export default function StoreVirtualChatWidget({
  storeName,
  storeId,
  storeSlug,
  whatsappPhone,
  rubro = "Comercio",
  products = [],
  onOpenProductModal,
  externalIsOpen,
  onExternalOpenChange,
}: StoreVirtualChatWidgetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isOpen) : val;
    setInternalIsOpen(nextVal);
    onExternalOpenChange?.(nextVal);
  };
  const [showNotificationBadge, setShowNotificationBadge] = useState(true);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Booking Form State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("11:00 AM");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const isShoes = rubro.toLowerCase().includes("calzad") || rubro.toLowerCase().includes("zapato");

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Initial welcome message
  useEffect(() => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const welcomeText = isShoes
      ? `¡Hola! 👋 Te damos la bienvenida a la vitrina oficial de *${storeName}*.\nSoy tu Asistente Virtual en vivo. Puedo ayudarte a verificar tallas disponibles, colores, envíos a provincia y coordinar tu reserva o cita.\n\n¿En qué modelo o talla te gustaría que te asesore hoy?`
      : `¡Hola! 👋 Te damos la bienvenida a la tienda oficial de *${storeName}*.\nSoy tu Asistente Virtual inteligente. Puedo verificar en tiempo real precios oficiales, stock en vitrina, marcas líderes, envíos a nivel nacional y separar tu pedido con garantía.\n\n¿Qué producto o consulta tienes hoy?`;

    setMessages([
      {
        id: "m-welcome",
        sender: "bot",
        text: welcomeText,
        time: now,
      },
    ]);
  }, [storeName, isShoes]);

  const addBotMessage = (
    text: string,
    actionCard?: "booking" | "whatsapp" | "shipping" | "products",
    suggestedProducts?: GroupedShoeModel[]
  ) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}-${Math.random()}`,
        sender: "bot",
        text,
        time,
        actionCard,
        suggestedProducts,
      },
    ]);
  };

  // Motor Inteligente de Respuesta del Catálogo
  const processCatalogQuery = async (queryText: string) => {
    const text = queryText.toLowerCase().trim();

    // 1. Detección automática de número de celular para captura de Lead
    const phoneMatch = text.match(/(\+?51)?\s?9\d{8}|\b9\d{8}\b/);
    if (phoneMatch) {
      const detectedPhone = phoneMatch[0].replace(/\s+/g, "");
      try {
        await createLeadRequest({
          name: clientName || "Cliente Chat Catálogo",
          phone: detectedPhone,
          businessName: storeName,
          interestType: "CHAT",
          notes: `Teléfono compartido en Chat: "${queryText}"`,
          targetUserId: storeId,
          storeIdentifier: storeSlug || storeId,
          isPlatformLead: false,
          utmSource: "StoreVirtualConcierge",
        });
      } catch { }
    }

    // 2. Intención: Cita o Reserva directa
    if (
      text.includes("cita") ||
      text.includes("agendar") ||
      text.includes("reservar") ||
      text.includes("separar") ||
      text.includes("apartar")
    ) {
      addBotMessage(
        `📅 ¡Con gusto coordinamos tu pedido o reserva! Por favor completa tus datos en este formulario rápido para registrarlo en el sistema de *${storeName}*:`,
        "booking"
      );
      return;
    }

    // 3. Intención: Envíos y Despachos
    if (
      text.includes("envio") ||
      text.includes("envíos") ||
      text.includes("despacho") ||
      text.includes("provincia") ||
      text.includes("lima") ||
      text.includes("shalom") ||
      text.includes("olva") ||
      text.includes("entrega") ||
      text.includes("cuanto tarda") ||
      text.includes("cuánto tarda") ||
      text.includes("flete")
    ) {
      addBotMessage(
        `🚚 *Envíos y Despachos Oficiales de ${storeName}*:\n\n` +
        `• Realizamos envíos diarios a Lima y todas las provincias del Perú vía Shalom, Olva Courier y agencias de carga certificadas.\n` +
        `• Todos los despachos viajan con número de remisión y seguimiento en tiempo real.\n` +
        `• Los productos se embalan con máxima protección y verificación previa de funcionamiento y serie.\n` +
        `• Tiempo habitual de llegada: de 24 a 48 horas según tu localidad.\n\n` +
        `¿A qué departamento o ciudad te gustaría cotizar tu entrega?`
      );
      return;
    }

    // 4. Intención: Medios de Pago y Facturación SUNAT
    if (
      text.includes("pago") ||
      text.includes("pagar") ||
      text.includes("yape") ||
      text.includes("plin") ||
      text.includes("bcp") ||
      text.includes("bbva") ||
      text.includes("interbank") ||
      text.includes("tarjeta") ||
      text.includes("transferencia") ||
      text.includes("boleta") ||
      text.includes("factura") ||
      text.includes("sunat") ||
      text.includes("cuenta")
    ) {
      addBotMessage(
        `💳 *Métodos de Pago Seguros en ${storeName}*:\n\n` +
        `• Aceptamos Yape, Plin, transferencias directas a cuentas BCP, BBVA, Interbank y pagos presenciales en tienda.\n` +
        `• Emitimos Boleta de Venta Electrónica o Factura con RUC oficial validada por SUNAT.\n` +
        `• Tu compra es 100% segura y con confirmación inmediata de voucher.\n\n` +
        `¿Deseas que te facilitemos los números de cuenta o código QR para tu pago?`
      );
      return;
    }

    // 5. Intención: Garantía y Originalidad
    if (
      text.includes("garantia") ||
      text.includes("garantía") ||
      text.includes("original") ||
      text.includes("nuevo") ||
      text.includes("sellado") ||
      text.includes("fábrica") ||
      text.includes("fabrica")
    ) {
      addBotMessage(
        `🛡️ *Garantía Oficial y Origen Certificado*:\n\n` +
        `• En *${storeName}* todos nuestros productos y equipos son 100% nuevos, originales y sellados de fábrica.\n` +
        `• Cuentan con respaldo técnico directo de las marcas fabricantes y garantía de cambio ante cualquier fallo técnico.\n` +
        `• Entregamos comprobante oficial que respalda tu garantía en todo el territorio nacional.`
      );
      return;
    }

    // 6. Intención: Búsqueda en el Catálogo de Productos en Tiempo Real
    if (products && products.length > 0) {
      // Filtrar productos por nombre, marca, categoría o descripción
      const searchWords = text
        .replace(/¿|\?|¡|!|,|\./g, "")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["hola", "tienen", "tiene", "busco", "quiero", "cual", "cuanto", "cuánto", "precio", "costo", "stock", "modelo"].includes(w));

      let matchedProducts: GroupedShoeModel[] = [];

      if (searchWords.length > 0) {
        matchedProducts = products.filter((p) => {
          const pName = (p.name || "").toLowerCase();
          const pBrand = (p.brandName || "").toLowerCase();
          const pFam = (p.familyName || "").toLowerCase();
          const pColor = (p.colorName || p.color || "").toLowerCase();
          const pSku = (p.sku || "").toLowerCase();

          return searchWords.some(
            (w) =>
              pName.includes(w) ||
              pBrand.includes(w) ||
              pFam.includes(w) ||
              pColor.includes(w) ||
              pSku.includes(w)
          );
        });
      }

      // Si pide específicamente "oferta" o "descuento"
      if (text.includes("oferta") || text.includes("descuento") || text.includes("promocion") || text.includes("promoción")) {
        const offerProds = products.filter((p) => p.hasOffer);
        if (offerProds.length > 0) {
          matchedProducts = offerProds.slice(0, 4);
        }
      }

      // Si no hubo coincidencia de palabras pero pregunta por catálogo general o marcas
      if (matchedProducts.length === 0 && (text.includes("catalogo") || text.includes("catálogo") || text.includes("producto") || text.includes("marca"))) {
        matchedProducts = products.slice(0, 3);
      }

      if (matchedProducts.length > 0) {
        const topMatches = matchedProducts.slice(0, 3);
        const productListStr = topMatches
          .map((m) => {
            const effPrice = (m.adjustedPrice || m.minPrice).toFixed(2);
            const offerTag = m.hasOffer ? ` (🔥 ¡Oferta -${m.discountPercent}%!)` : "";
            const stockTag = m.totalStock > 0 ? `✅ ${m.totalStock} disponibles` : "⚠️ Stock limitado";
            const colorTag = m.colorName ? ` | Tono: ${m.colorName}` : "";
            return `🔹 *${m.name}*\n   🏷️ Marca: ${m.brandName} | S/ ${effPrice}${offerTag}\n   📦 ${stockTag}${colorTag}`;
          })
          .join("\n\n");

        addBotMessage(
          `✨ En *${storeName}* contamos con estas excelentes opciones disponibles en vitrina:\n\n${productListStr}\n\n¿Te gustaría separar alguno de estos modelos o deseas consultar por otra especificación?`,
          "products",
          topMatches
        );
        return;
      }
    }

    // 7. Intención: Horarios de Atención y Contacto
    if (
      text.includes("horario") ||
      text.includes("atencion") ||
      text.includes("atención") ||
      text.includes("abierto") ||
      text.includes("ubicacion") ||
      text.includes("ubicación") ||
      text.includes("donde estan") ||
      text.includes("dónde están") ||
      text.includes("direccion") ||
      text.includes("dirección")
    ) {
      addBotMessage(
        `📍 *Atención y Canales Oficiales de ${storeName}*:\n\n` +
        `• Horario de atención: Lunes a Sábado de 8:30 AM a 8:00 PM (Domingos hasta las 2:00 PM).\n` +
        `• WhatsApp Oficial para consultas y pedidos inmediatos: +${whatsappPhone}\n` +
        `• Todos los pedidos en línea se atienden con confirmación prioritaria.\n\n` +
        `¿Deseas agendar una cita presencial o coordinar entrega directa por WhatsApp?`,
        "booking"
      );
      return;
    }

    // 8. Fallback Amable y Orientado al Negocio
    addBotMessage(
      `¡Entendido! Con mucho gusto te oriento en *${storeName}*.\n\nPuedes consultarme por:\n` +
      `• 🔍 *Modelos y Marcas*: Precios, especificaciones y stock en tiempo real.\n` +
      `• 🚚 *Despachos y Envíos*: Tiempos de entrega y agencias a provincia.\n` +
      `• 💳 *Pagos*: Yape, Plin, BCP, BBVA y Facturación SUNAT.\n` +
      `• 📅 *Reservas*: Puedes separar tu producto agendando una cita rápida.\n\n` +
      `¿Qué producto o duda tienes en mente?`
    );
  };

  const handleQuickQuestion = (type: "stock" | "shipping" | "booking" | "payment" | "warranty") => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (type === "stock") {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: "user",
          text: isShoes ? "Consultar disponibilidad de tallas y modelos" : "Consultar stock y marcas disponibles",
          time: now,
        },
      ]);
      setTimeout(() => {
        processCatalogQuery(isShoes ? "tallas calzados en stock" : "modelos y marcas en stock");
      }, 300);
    } else if (type === "shipping") {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: "user",
          text: "¿Cómo funcionan los envíos a provincia?",
          time: now,
        },
      ]);
      setTimeout(() => {
        processCatalogQuery("envios a provincia");
      }, 300);
    } else if (type === "booking") {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: "user",
          text: "Deseo agendar una cita / reservar un producto",
          time: now,
        },
      ]);
      setTimeout(() => {
        processCatalogQuery("agendar cita");
      }, 300);
    } else if (type === "payment") {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: "user",
          text: "¿Cuáles son los métodos de pago y emiten factura?",
          time: now,
        },
      ]);
      setTimeout(() => {
        processCatalogQuery("metodos de pago y factura");
      }, 300);
    } else if (type === "warranty") {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: "user",
          text: "¿Cuentan con garantía oficial de fábrica?",
          time: now,
        },
      ]);
      setTimeout(() => {
        processCatalogQuery("garantia oficial");
      }, 300);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = inputText.trim();
    setInputText("");

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: "user",
        text: userMsg,
        time,
      },
    ]);

    setTimeout(() => {
      processCatalogQuery(userMsg);
    }, 400);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error("Por favor completa tu nombre y número de WhatsApp");
      return;
    }

    setIsSubmitting(true);
    try {
      await createLeadRequest({
        name: clientName.trim(),
        phone: clientPhone.trim(),
        businessName: storeName,
        interestType: "CITA",
        notes: `Cita solicitada desde el Catálogo Web de ${storeName}. Modelo/Interés: ${bookingNotes || "Producto de vitrina"}`,
        appointmentDate: bookingDate || undefined,
        appointmentTime: bookingTime || undefined,
        targetUserId: storeId,
        storeIdentifier: storeSlug || storeId,
        isPlatformLead: false,
        utmSource: "CatalogVirtualChat",
      });

      setBookingSuccess(true);
      toast.success("¡Cita y reserva registrada con éxito!", { icon: "📅" });

      addBotMessage(
        `✅ ¡Excelente, ${clientName}! Hemos registrado tu solicitud en el sistema para el ${bookingDate || "próximo día hábil"} a las ${bookingTime}.\n\nUn asesor oficial de *${storeName}* se comunicará a tu WhatsApp (*${clientPhone}*) para confirmar los detalles.`,
        "whatsapp"
      );
    } catch {
      toast.error("No se pudo registrar la cita. Por favor intenta por WhatsApp directo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectWhatsAppClick = () => {
    const raw = whatsappPhone || "";
    const clean = raw.replace(/\D/g, "");
    const formattedPhone = clean.startsWith("51") ? clean : `51${clean || "929962458"}`;
    const text = `¡Hola *${storeName}*! Mi nombre es *${clientName || "Cliente"}*. Deseo confirmar mi pedido o reserva realizada desde su Catálogo Web. ¿Podrían atenderme?`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <>
      {/* ──────────────────────────────────────────────────────────
          FLOATING CHAT BADGE TRIGGER
      ────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {/* Teaser Tooltip Bubble */}
        {!isOpen && showNotificationBadge && (
          <div
            onClick={() => {
              setIsOpen(true);
              setShowNotificationBadge(false);
            }}
            className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/90 max-w-xs cursor-pointer hover:scale-105 transition-all text-xs text-slate-800 flex items-start gap-2.5 animate-bounce shadow-indigo-500/10 select-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 font-bold">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 leading-tight">
                ¿Dudas con algún modelo o precio?
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chatea en vivo con el asistente de {storeName} y agenda tu pedido.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNotificationBadge(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Floating Circle Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowNotificationBadge(false);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all cursor-pointer active:scale-95 group relative"
          title="Abrir Asistente Virtual y Citas"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative">
              <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          CHAT WINDOW MODAL
      ────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[640px] h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-fadeIn font-sans">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 font-black">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black truncate">{storeName}</h4>
                <p className="text-[11px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                  Asistente Virtual • En Línea
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 text-xs custom-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed ${m.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-xs font-medium"
                      : "bg-white text-slate-800 rounded-bl-none border border-slate-200/90 shadow-2xs"
                    }`}
                >
                  <p className="whitespace-pre-line text-xs">{m.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>

                {/* Suggested Products Mini Cards */}
                {m.actionCard === "products" && m.suggestedProducts && m.suggestedProducts.length > 0 && (
                  <div className="mt-2.5 w-full space-y-2">
                    {m.suggestedProducts.map((sp) => (
                      <div
                        key={sp.key}
                        className="bg-white p-2.5 rounded-2xl border border-indigo-100 shadow-2xs flex items-center gap-3 hover:border-indigo-300 transition-colors"
                      >
                        <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                          {sp.imageUrl ? (
                            <img src={sp.imageUrl} alt={sp.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-900 truncate">{sp.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold">
                            {sp.brandName} •{" "}
                            <span className="text-indigo-600 font-black">
                              S/ {(sp.adjustedPrice || sp.minPrice).toFixed(2)}
                            </span>
                          </p>
                        </div>
                        {onOpenProductModal && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenProductModal(sp);
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] shrink-0 cursor-pointer transition-colors"
                          >
                            Ver
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* WhatsApp Connect Action Card */}
                {m.actionCard === "whatsapp" && (
                  <div className="mt-2.5 w-full bg-emerald-50 p-3 rounded-2xl border border-emerald-200 space-y-2">
                    <p className="text-[11px] font-bold text-emerald-900">
                      ¿Deseas confirmar la cita inmediatamente con un asesor por WhatsApp?
                    </p>
                    <button
                      type="button"
                      onClick={handleDirectWhatsAppClick}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <FaWhatsapp className="w-4 h-4" />
                      <span>Abrir WhatsApp Oficial</span>
                    </button>
                  </div>
                )}

                {/* Booking Form inside Message */}
                {m.actionCard === "booking" && !bookingSuccess && (
                  <div className="mt-2.5 w-full bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Agendar Cita / Separar Pedido</span>
                    </div>

                    <form onSubmit={handleBookingSubmit} className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Tu Nombre Completo *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: David Pérez"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          WhatsApp / Celular *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej: 987654321"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Fecha de Cita
                          </label>
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Horario
                          </label>
                          <select
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50"
                          >
                            <option>10:00 AM</option>
                            <option>11:00 AM</option>
                            <option>02:00 PM</option>
                            <option>04:00 PM</option>
                            <option>06:00 PM</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Modelo / Interés de Compra
                        </label>
                        <input
                          type="text"
                          placeholder={isShoes ? "Ej: Stiletto Charol Talla 37" : "Ej: Refrigeradora Samsung 390L Inox"}
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? "Registrando Cita..." : "Confirmar Cita / Reserva"}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestions */}
          <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold scrollbar-none">
            <button
              type="button"
              onClick={() => handleQuickQuestion("stock")}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 shrink-0 border border-slate-200 transition-colors cursor-pointer"
            >
              {isShoes ? "👠 Consultar Talla" : "⚡ Ver Modelos & Stock"}
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("shipping")}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 shrink-0 border border-slate-200 transition-colors cursor-pointer"
            >
              🚚 Envíos a Provincia
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("payment")}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 shrink-0 border border-slate-200 transition-colors cursor-pointer"
            >
              💳 Medios de Pago
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("warranty")}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 shrink-0 border border-slate-200 transition-colors cursor-pointer"
            >
              🛡️ Garantía Oficial
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("booking")}
              className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 font-black hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              📅 Agendar Cita
            </button>
          </div>

          {/* Footer Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe tu consulta sobre productos o envíos..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
