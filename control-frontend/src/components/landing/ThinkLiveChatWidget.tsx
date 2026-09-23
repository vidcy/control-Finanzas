import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Phone,
  Zap,
  ArrowRight,
  Bot,
} from "lucide-react";
import { sendChatMessageRequest, createLeadRequest } from "../../services/lead.api";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  quickActions?: string[];
}

export default function ThinkLiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [phoneCapture, setPhoneCapture] = useState("");
  const [nameCapture, setNameCapture] = useState("");
  const [isPhoneCaptured, setIsPhoneCaptured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "¡Hola! 👋 Soy tu Asesor Virtual de THINK. ¿Te gustaría saber cómo controlar tu stock en tiempo real, evitar fugas de dinero o ver una demostración en vivo?",
      time: "Ahora",
      quickActions: [
        "¿Cómo funciona con Calzados y Series?",
        "¿Cuáles son los Precios?",
        "Separar Cita / Demostración",
        "¿Tiene Facturación SUNAT?",
      ],
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await sendChatMessageRequest({
        message: text,
        phone: phoneCapture || undefined,
        name: nameCapture || undefined,
      });

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickActions: res.quickActions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "¡Gracias por contactarnos! Un asesor te responderá a la brevedad. Déjanos tu número de WhatsApp para darte atención personalizada inmediata.",
          time: "Ahora",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneCapture || phoneCapture.length < 8) {
      toast.error("Ingresa un número de WhatsApp válido");
      return;
    }

    try {
      await createLeadRequest({
        name: nameCapture || "Contacto Chat Express",
        phone: phoneCapture,
        interestType: "CHAT",
        notes: `Solicitó asesoría directa por WhatsApp desde el widget de chat`,
        utmSource: "LandingChatWidget",
      });

      setIsPhoneCaptured(true);
      toast.success("¡Excelente! Te contactaremos por WhatsApp en breve");

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `🎉 ¡Muchas gracias ${nameCapture || ""}! Registramos tu número (${phoneCapture}). Uno de nuestros especialistas comerciales te escribirá por WhatsApp con la información y tu demo guiada.`,
          time: "Ahora",
        },
      ]);
    } catch {
      toast.error("Ocurrió un error al guardar tu contacto");
    }
  };

  return (
    <>
      {/* BOTÓN FLOTANTE TRIGGER */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-2 bg-slate-900 text-white text-xs font-bold py-2 px-3.5 rounded-2xl shadow-xl border border-indigo-500/40 flex items-center gap-2 cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>¿Deseas una demostración gratuita?</span>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-sky-500 to-indigo-700 text-white shadow-2xl shadow-indigo-600/50 flex items-center justify-center cursor-pointer border-2 border-white/80 group"
          aria-label="Abrir Chat de Asesoría"
        >
          {isOpen ? (
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </motion.button>
      </div>

      {/* VENTANA DEL CHAT */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[580px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-50 flex flex-col overflow-hidden"
          >
            {/* Header del Chat */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-black text-sm tracking-tight">
                    <span>Asesor THINK</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span>🟢 En línea ahora</span>
                    <span className="text-slate-400">• Respuesta inmediata</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Banner de captura rápida de WhatsApp si no se ha capturado */}
            {!isPhoneCaptured && (
              <div className="bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-2.5 border-b border-indigo-100 flex items-center justify-between text-xs">
                <span className="text-indigo-950 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  ¿Quieres demo por WhatsApp?
                </span>
                <span className="text-[11px] text-indigo-600 font-extrabold uppercase tracking-wide">
                  En 60s
                </span>
              </div>
            )}

            {/* Stream de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-br-xs shadow-md"
                        : "bg-white text-slate-800 rounded-bl-xs border border-slate-200/70 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line font-medium">{m.text}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        m.sender === "user" ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>

                  {/* Acciones Rápidas del Bot */}
                  {m.quickActions && m.quickActions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                      {m.quickActions.map((qa, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(qa)}
                          className="text-[11px] font-bold bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 hover:border-indigo-300 py-1.5 px-3 rounded-xl transition-all shadow-2xs active:scale-95 text-left cursor-pointer"
                        >
                          {qa}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-spin">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium animate-pulse">Escribiendo respuesta...</span>
                </div>
              )}

              {/* Formulario integrado de captura si aún no dejó WhatsApp */}
              {!isPhoneCaptured && (
                <div className="bg-white rounded-2xl p-3.5 border border-indigo-100 shadow-sm space-y-2 mt-2">
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    Déjanos tu WhatsApp para enviarte video y precios:
                  </div>
                  <form onSubmit={handleQuickLeadSubmit} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Tu nombre (opcional)"
                      value={nameCapture}
                      onChange={(e) => setNameCapture(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="Número de WhatsApp (ej: 912345678)"
                        value={phoneCapture}
                        onChange={(e) => setPhoneCapture(e.target.value)}
                        className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Enviar <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensaje */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Escribe tu consulta aquí..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-100 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-10 h-10 rounded-2xl bg-indigo-600 disabled:opacity-40 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
