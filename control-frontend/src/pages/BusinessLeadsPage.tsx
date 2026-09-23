import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
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
} from "lucide-react";
import {
  getLeadsRequest,
  getLeadStatsRequest,
  updateLeadRequest,
  deleteLeadRequest,
  type Lead,
  type LeadStats,
} from "../services/lead.api";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";

export default function BusinessLeadsPage() {
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<any>("NEW");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

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
      // Actualizar stats
      getLeadStatsRequest().then(setStats).catch(() => null);
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
      getLeadStatsRequest().then(setStats).catch(() => null);
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
      getLeadStatsRequest().then(setStats).catch(() => null);
    } catch {
      toast.error("Error al guardar cambios");
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
    if (lead.interestType === "CITA" && lead.appointmentDate) {
      message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de THINK. Vemos que solicitaste agendar una demostración para el día ${lead.appointmentDate} a las ${lead.appointmentTime || "por confirmar"} para tu negocio ${lead.businessName || ""}. ¿Te parece bien coordinar el enlace por aquí?`;
    } else {
      message = `¡Hola ${lead.name}! 👋 Te saluda el equipo de THINK. Vimos que solicitaste asesoría sobre el sistema para tu negocio ${lead.businessName ? `(${lead.businessName})` : ""}. ¿En qué momento te convendría ver una demostración de 10 minutos?`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || "").includes(searchTerm) ||
      (l.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            Venta Cerrada
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
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Ventas & Marketing THINK
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Prospectos & Citas de Clientes
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Gestiona todos los clientes potenciales captados en la página web, solicitudes de cita y chat en vivo.
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 w-fit cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar Lista
          </button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Total Leads
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
                Ventas Ganadas
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
              placeholder="Buscar por nombre, teléfono, negocio o rubro..."
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
                Cuando los clientes interactúen con el formulario de citas, chat en vivo o botones de WhatsApp en la página web, aparecerán aquí.
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
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                        {lead.interestType}
                      </span>
                      {lead.utmSource && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                          Fuente: {lead.utmSource}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5 text-indigo-600 font-black">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone}
                      </span>
                      {lead.businessName && (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          Negocio: <strong>{lead.businessName}</strong>
                        </span>
                      )}
                      {lead.businessType && (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
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
                      title="Abrir chat de WhatsApp con plantilla de venta lista"
                    >
                      <MessageSquare className="w-4 h-4 fill-white" />
                      Contactar por WhatsApp
                    </button>

                    {/* Quick status dropdown */}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 shadow-2xs"
                    >
                      <option value="NEW">Nuevo</option>
                      <option value="SCHEDULED">Cita Agendada</option>
                      <option value="CONTACTED">En Negociación</option>
                      <option value="WON">Venta Cerrada</option>
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
