import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  MessageCircle,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Send,
} from "lucide-react";
import { createLeadRequest } from "../../services/lead.api";
import { toast } from "react-hot-toast";

interface CatalogLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  storePhone?: string;
  storeIdentifier: string;
  targetUserId?: string;
  initialProduct?: {
    name: string;
    sku?: string;
    price?: number;
    size?: string;
  } | null;
}

export default function CatalogLeadModal({
  isOpen,
  onClose,
  storeName,
  storePhone,
  storeIdentifier,
  targetUserId,
  initialProduct,
}: CatalogLeadModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interestType, setInterestType] = useState<string>("CITA");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00 AM");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Por favor completa tu nombre y número de WhatsApp");
      return;
    }

    setIsSubmitting(true);
    try {
      const productText = initialProduct
        ? `${initialProduct.name}${initialProduct.size ? ` (Talla: ${initialProduct.size})` : ""}${initialProduct.price ? ` - S/ ${initialProduct.price.toFixed(2)}` : ""}`
        : undefined;

      await createLeadRequest({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        businessName: storeName,
        interestType,
        appointmentDate: appointmentDate || undefined,
        appointmentTime: appointmentDate ? appointmentTime : undefined,
        productName: productText || undefined,
        productSku: initialProduct?.sku || undefined,
        notes: notes.trim() || undefined,
        storeIdentifier,
        targetUserId,
        isPlatformLead: false,
        utmSource: "CatalogInteractiveModal",
      });

      setIsSuccess(true);
      toast.success("¡Tu solicitud fue enviada con éxito a la tienda!");
    } catch {
      toast.error("Hubo un error al enviar tu solicitud. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWhatsAppAfterSubmit = () => {
    const raw = storePhone || "51929962458";
    const clean = raw.replace(/\D/g, "");
    const formattedPhone = clean.startsWith("51") ? clean : `51${clean}`;

    const text = `¡Hola *${storeName}*! Mi nombre es *${name}*. Acabo de enviar una solicitud desde su catálogo web (${interestType === "CITA" ? `Cita para el día ${appointmentDate} a las ${appointmentTime}` : "Consulta / Cotización"}${initialProduct ? ` por: ${initialProduct.name}` : ""}). ¿Podrían atenderme por aquí?`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsSuccess(false);
    setName("");
    setPhone("");
    setEmail("");
    setAppointmentDate("");
    setNotes("");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseModal}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-[#EDE2D4] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FAF8F5] via-[#F5EFEB] to-[#FAF8F5] border-b border-[#EDE2D4] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-cinzel font-bold text-amber-800 uppercase tracking-widest mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Atención Exclusiva</span>
              </div>
              <h3 className="font-playfair text-xl font-bold text-slate-900 leading-tight">
                {initialProduct ? "Solicitud de Cita / Cotización" : `Contactar con ${storeName}`}
              </h3>
            </div>
            <button
              onClick={handleCloseModal}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="font-playfair text-2xl font-bold text-slate-900">
                ¡Solicitud Recibida con Éxito!
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 font-outfit max-w-sm mx-auto leading-relaxed">
                El equipo de <strong className="text-slate-800">{storeName}</strong> ha registrado tu solicitud. Te contactaremos a tu número de WhatsApp para confirmar los detalles.
              </p>

              <div className="pt-3 flex flex-col sm:flex-row items-center gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleOpenWhatsAppAfterSubmit}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Continuar por WhatsApp Ahora</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 font-outfit">
              {/* Pre-selected Product Banner */}
              {initialProduct && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-[10px] font-cinzel font-bold uppercase text-amber-800 block leading-tight">
                      Producto Seleccionado
                    </span>
                    <h5 className="font-playfair text-sm font-bold text-slate-900 truncate">
                      {initialProduct.name}
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {initialProduct.price && (
                        <span className="font-black text-rose-600">
                          S/ {initialProduct.price.toFixed(2)}
                        </span>
                      )}
                      {initialProduct.size && (
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-amber-200 text-slate-700 font-bold">
                          Talla: {initialProduct.size}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-slate-700 mb-1">
                    Tu Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carmen Rodríguez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-slate-700 mb-1">
                    Número de WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Type of Request */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-slate-700 mb-1">
                  Tipo de Solicitud
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "CITA", label: "Agendar Cita", icon: Calendar },
                    { id: "COTIZACION", label: "Cotización", icon: Sparkles },
                    { id: "WHATSAPP", label: "Consulta Envío", icon: MessageCircle },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = interestType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setInterestType(opt.id)}
                        className={`p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs scale-102"
                            : "bg-[#FAF8F5] text-slate-700 border-slate-200 hover:border-amber-400"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time if Cita */}
              {interestType === "CITA" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-[10px] font-cinzel font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-700" />
                      Fecha Preferida
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-cinzel font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      Horario Sugerido
                    </label>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                    >
                      <option value="Mañana (9:00 AM - 12:00 PM)">Mañana (9:00 AM - 12:00 PM)</option>
                      <option value="Tarde (2:00 PM - 5:00 PM)">Tarde (2:00 PM - 5:00 PM)</option>
                      <option value="Noche (5:00 PM - 8:30 PM)">Noche (5:00 PM - 8:30 PM)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-slate-700 mb-1">
                  Mensaje o Consulta Específica (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Escribe aquí tu consulta sobre modelos, tallas, entrega a domicilio..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 rounded-2xl bg-slate-900 hover:bg-amber-800 text-white font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Enviando..." : "Enviar Solicitud a la Tienda"}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
