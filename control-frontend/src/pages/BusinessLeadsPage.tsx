import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Appshell from "../components/layout/Appshell";
import { useAuth } from "../auth/AuthContext";
import {
  Users,
  Calendar,
  Phone,
  MessageSquare,
  TrendingUp,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles,
  Building,
  RefreshCw,
  ShoppingBag,
  Zap,
  Plus,
  Clock,
  Crown,
  Store,
  Globe,
  ExternalLink,
} from "lucide-react";
import {
  getLeadsRequest,
  getLeadStatsRequest,
  updateLeadRequest,
  deleteLeadRequest,
  createLeadRequest,
  type Lead,
  type LeadStats,
} from "../services/lead.api";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";

export default function BusinessLeadsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const [searchParams, setSearchParams] = useSearchParams();
  const queryScope = searchParams.get("scope");

  // Determine active scope:
  // If user is admin, allow PLATFORM, STORE or ALL (defaults to PLATFORM).
  // If not admin, strictly locked to STORE!
  const [activeScope, setActiveScope] = useState<"PLATFORM" | "STORE" | "ALL">(
    isAdmin ? (queryScope === "STORE" ? "STORE" : queryScope === "ALL" ? "ALL" : "PLATFORM") : "STORE"
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    newCount: 0,
    scheduled: 0,
    won: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Edit / Reschedule Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<any>("NEW");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // New Manual Lead Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessType, setNewBusinessType] = useState("");
  const [newInterestType, setNewInterestType] = useState<string>("CITA");
  const [newAppointmentDate, setNewAppointmentDate] = useState("");
  const [newAppointmentTime, setNewAppointmentTime] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  // Sync state if query param changes
  useEffect(() => {
    if (isAdmin && queryScope) {
      if (queryScope === "STORE" || queryScope === "PLATFORM" || queryScope === "ALL") {
        setActiveScope(queryScope as any);
      }
    }
  }, [queryScope, isAdmin]);

  const handleScopeChange = (newScope: "PLATFORM" | "STORE" | "ALL") => {
    setActiveScope(newScope);
    setSearchParams({ scope: newScope });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, statsData] = await Promise.all([
        getLeadsRequest(statusFilter),
        getLeadStatsRequest(),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch {
      toast.error("Error al cargar los prospectos comerciales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleStatusChange = async (leadId: string, newStatus: any) => {
    try {
      await updateLeadRequest(leadId, { status: newStatus });
      toast.success("Estado actualizado");
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      getLeadStatsRequest(activeScope).then(setStats).catch(() => null);
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar este prospecto?")) return;
    try {
      await deleteLeadRequest(id);
      toast.success("Prospecto eliminado");
      setLeads((prev) => prev.filter((l) => l.id !== id));
      getLeadStatsRequest(activeScope).then(setStats).catch(() => null);
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || "");
    setEditStatus(lead.status);
    setEditDate(lead.appointmentDate || "");
    setEditTime(lead.appointmentTime || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedLead) return;
    try {
      const updated = await updateLeadRequest(selectedLead.id, {
        notes: editNotes,
        status: editStatus,
        appointmentDate: editDate || undefined,
        appointmentTime: editTime || undefined,
      });
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      toast.success("Prospecto actualizado");
      setIsEditModalOpen(false);
      getLeadStatsRequest(activeScope).then(setStats).catch(() => null);
    } catch {
      toast.error("Error al guardar cambios");
    }
  };

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Ingresa al menos el nombre y número de teléfono/WhatsApp");
      return;
    }

    setIsCreatingLead(true);
    try {
      const isPlatform = activeScope === "PLATFORM";
      await createLeadRequest({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        businessName: newBusinessName.trim() || undefined,
        businessType: newBusinessType.trim() || undefined,
        interestType: newInterestType,
        appointmentDate: newAppointmentDate || undefined,
        appointmentTime: newAppointmentTime || undefined,
        productName: newProductName.trim() || undefined,
        notes: newNotes.trim() || undefined,
        utmSource: isPlatform ? "ManualAdmin" : "ManualStore",
        isPlatformLead: isPlatform,
        targetUserId: isPlatform ? undefined : user?.id,
        storeIdentifier: isPlatform ? undefined : (user?.businessSlug || user?.id),
      });

      toast.success("¡Prospecto registrado exitosamente!");
      setIsNewModalOpen(false);
      // Reset form
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewBusinessName("");
      setNewBusinessType("");
      setNewAppointmentDate("");
      setNewAppointmentTime("");
      setNewProductName("");
      setNewNotes("");
      loadData();
    } catch {
      toast.error("Error al registrar el prospecto");
    } finally {
      setIsCreatingLead(false);
    }
  };

  const getCleanPhone = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length === 9) return `51${digits}`;
    return digits;
  };

  const openWhatsApp = (lead: Lead) => {
    const cleanPhone = getCleanPhone(lead.phone);
    if (!cleanPhone) {
      toast.error("Número de teléfono no disponible");
      return;
    }

    let message = "";
    if (lead.isPlatformLead) {
      // Mensaje de Plataforma THINK ERP (para Administrador)
      if (lead.interestType === "CITA" && lead.appointmentDate) {
        message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de THINK ERP. Vemos que solicitaste agendar una demostración del sistema para el día ${lead.appointmentDate} a las ${lead.appointmentTime || "por confirmar"} para tu negocio ${lead.businessName || ""}. ¿Te parece bien coordinar el enlace por aquí?`;
      } else {
        message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de THINK ERP. Vimos que solicitaste información sobre el sistema financiero y POS para tu negocio ${lead.businessName ? `(${lead.businessName})` : ""}. ¿En qué momento te convendría ver una demostración rápida de 10 minutos?`;
      }
    } else {
      // Mensaje del Negocio / Catálogo (para Clientes de la tienda)
      const storeName = user?.businessName || lead.businessName || "la tienda";
      if (lead.productName) {
        message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de *${storeName}*. Recibimos tu consulta desde nuestro catálogo web sobre *${lead.productName}* ${lead.productSku ? `(SKU: ${lead.productSku})` : ""}${lead.appointmentDate ? `, solicitando cita para el ${lead.appointmentDate} a las ${lead.appointmentTime || "por coordinar"}` : ""}. ¿Te gustaría confirmar disponibilidad y entrega inmediata?`;
      } else if (lead.appointmentDate) {
        message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de *${storeName}*. Vemos tu solicitud de cita/visita para el día ${lead.appointmentDate} a las ${lead.appointmentTime || "por coordinar"}. ¿Te gustaría que te confirmemos la atención personalizada?`;
      } else {
        message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de *${storeName}*. Recibimos tu solicitud de contacto desde nuestro catálogo web oficial. ¿En qué podemos asesorarte hoy?`;
      }
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || "").includes(searchTerm) ||
      (l.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.productSku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.businessType || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Nuevo Prospecto
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 w-fit">
            <Calendar className="w-3.5 h-3.5" />
            Cita Agendada
          </span>
        );
      case "CONTACTED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 w-fit">
            <Phone className="w-3.5 h-3.5" />
            En Negociación
          </span>
        );
      case "WON":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Venta Cerrada 🎉
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 w-fit">
            Descartado
          </span>
        );
    }
  };

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isAdmin ? (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-black uppercase tracking-wider border border-purple-100 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  Módulo Exclusivo Admin - Captación THINK ERP
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider border border-amber-200 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-amber-700" />
                  Clientes & Citas de mi Tienda Web ({user?.businessName || "Mi Negocio"})
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              {isAdmin
                ? "Prospectos & Citas - Plataforma THINK ERP"
                : `Clientes & Citas de ${user?.businessName || "mi Tienda"}`}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {isAdmin
                ? "Prospectos y empresas interesadas en contratar el sistema THINK ERP (captados por Landing Page, Asesor Chat o Demostraciones)."
                : "Clientes interesados en tus productos, cotizaciones y citas de atención captadas en tu catálogo virtual."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Prospecto</span>
            </button>

            <button
              onClick={loadData}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 cursor-pointer"
              title="Recargar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Total Prospectos
              </div>
              <div className="text-2xl font-black text-gray-900">{stats.total}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Por Contactar
              </div>
              <div className="text-2xl font-black text-rose-600">{stats.newCount}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Citas Agendadas
              </div>
              <div className="text-2xl font-black text-indigo-600">{stats.scheduled}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Ventas Cerradas
              </div>
              <div className="text-2xl font-black text-emerald-600">{stats.won}</div>
            </div>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, artículo o negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: "ALL", label: "Todos" },
              { id: "NEW", label: "Nuevos" },
              { id: "SCHEDULED", label: "Citas" },
              { id: "CONTACTED", label: "En Negociación" },
              { id: "WON", label: "Ganados" },
              { id: "LOST", label: "Descartados" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* LEADS LIST / TABLE */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <span>Cargando prospectos...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
              <Users className="w-12 h-12 text-slate-300 mb-2" />
              <div className="text-base font-black text-slate-700">No hay prospectos en esta sección</div>
              <div className="text-xs text-slate-400 max-w-sm">
                {activeScope === "PLATFORM"
                  ? "Los leads captados en la página web principal de THINK ERP aparecerán aquí."
                  : "Cuando tus clientes interactúen con tu catálogo web o agenden citas, aparecerán aquí automáticamente."}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  {/* Lead Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-black text-base text-slate-900">{lead.name}</span>
                      {getStatusBadge(lead.status)}

                      {/* Origin Badge */}
                      {lead.isPlatformLead ? (
                        <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-500" />
                          Plataforma THINK ERP
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                          <Store className="w-3 h-3 text-amber-600" />
                          Catálogo Web: {lead.storeIdentifier || "Tienda"}
                        </span>
                      )}

                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                        {lead.interestType}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5 text-indigo-600 font-black">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone}
                      </span>

                      {lead.email && (
                        <span className="text-slate-500">
                          ✉️ {lead.email}
                        </span>
                      )}

                      {lead.productName && (
                        <span className="flex items-center gap-1.5 text-sky-900 font-bold bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                          <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                          Artículo: <strong>{lead.productName}</strong>
                          {lead.productSku ? ` (${lead.productSku})` : ""}
                        </span>
                      )}

                      {lead.businessName && (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          Negocio: <strong>{lead.businessName}</strong>
                        </span>
                      )}

                      {lead.businessType && (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          Rubro: <strong>{lead.businessType}</strong>
                        </span>
                      )}

                      {lead.appointmentDate && (
                        <span className="flex items-center gap-1.5 text-rose-600 font-black bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100">
                          <Calendar className="w-3.5 h-3.5" />
                          Cita: {lead.appointmentDate} {lead.appointmentTime ? `a las ${lead.appointmentTime}` : ""}
                        </span>
                      )}

                      <span className="text-slate-400 text-[11px]">
                        Captado el {new Date(lead.createdAt).toLocaleDateString()} a las{" "}
                        {new Date(lead.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {lead.notes && (
                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl font-medium max-w-2xl">
                        {lead.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions & WhatsApp button */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => openWhatsApp(lead)}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                      title="Abrir chat de WhatsApp con plantilla personalizada"
                    >
                      <MessageSquare className="w-4 h-4 fill-white" />
                      Contactar por WhatsApp
                    </button>

                    <a
                      href={`tel:${getCleanPhone(lead.phone)}`}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                      title="Llamar al cliente"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    {/* Quick status dropdown */}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 shadow-2xs"
                    >
                      <option value="NEW">Nuevo</option>
                      <option value="SCHEDULED">Cita Agendada</option>
                      <option value="CONTACTED">En Negociación</option>
                      <option value="WON">Venta Cerrada 🎉</option>
                      <option value="LOST">Descartado</option>
                    </select>

                    <button
                      onClick={() => handleOpenEdit(lead)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                      title="Editar notas o reprogramar cita"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar prospecto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVO PROSPECTO MANUAL */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title={activeScope === "PLATFORM" ? "Nuevo Prospecto THINK ERP" : "Nuevo Cliente / Prospecto de mi Tienda"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateManualLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. María Flores"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                WhatsApp / Teléfono *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 987654321"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Tipo de Solicitud
              </label>
              <select
                value={newInterestType}
                onChange={(e) => setNewInterestType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="CITA">Agendar Cita / Visita</option>
                <option value="COTIZACION">Solicitud de Cotización</option>
                <option value="DEMO">Demostración en Vivo</option>
                <option value="WHATSAPP">Consulta WhatsApp</option>
                <option value="PRODUCT_INQUIRY">Consulta de Producto</option>
              </select>
            </div>
          </div>

          {activeScope === "PLATFORM" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  Nombre de su Negocio
                </label>
                <input
                  type="text"
                  placeholder="Ej. Calzados El Sol"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  Rubro del Negocio
                </label>
                <input
                  type="text"
                  placeholder="Ej. Calzado, Abarrotes, etc."
                  value={newBusinessType}
                  onChange={(e) => setNewBusinessType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Artículo / Producto de Interés
              </label>
              <input
                type="text"
                placeholder="Ej. Stiletto Glamour Rojo o Refrigeradora Mabe"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Fecha de la Cita (Opcional)
              </label>
              <input
                type="date"
                value={newAppointmentDate}
                onChange={(e) => setNewAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Hora de la Cita (Opcional)
              </label>
              <input
                type="time"
                value={newAppointmentTime}
                onChange={(e) => setNewAppointmentTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-600 mb-1">
              Notas y Observaciones
            </label>
            <textarea
              rows={3}
              placeholder="Detalles conversados o solicitudes específicas..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingLead}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-colors shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {isCreatingLead ? "Guardando..." : "Registrar Prospecto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE EDICIÓN Y REPROGRAMACIÓN DE CITA */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Gestionar Prospecto / Cita"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Estado Comercial
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="NEW">Nuevo Prospecto</option>
              <option value="SCHEDULED">Cita Agendada</option>
              <option value="CONTACTED">En Negociación</option>
              <option value="WON">Venta Cerrada 🎉</option>
              <option value="LOST">Descartado</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Fecha de Cita
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Hora de Cita
              </label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Notas y Seguimiento
            </label>
            <textarea
              rows={4}
              placeholder="Escribe lo conversado con el cliente, dudas, requerimientos..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </Modal>
    </Appshell>
  );
}
