import API from "./axios";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  interestType: string;
  status: "NEW" | "CONTACTED" | "SCHEDULED" | "WON" | "LOST";
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  monthlySalesVolume?: string;
  utmSource?: string;
  utmCampaign?: string;
  targetUserId?: string;
  storeIdentifier?: string;
  isPlatformLead?: boolean;
  productName?: string;
  productSku?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadPayload {
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  interestType?: "DEMO" | "CITA" | "COTIZACION" | "CHAT" | "WHATSAPP" | "PRODUCT_INQUIRY" | string;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  monthlySalesVolume?: string;
  utmSource?: string;
  utmCampaign?: string;
  targetUserId?: string;
  storeIdentifier?: string;
  isPlatformLead?: boolean;
  productName?: string;
  productSku?: string;
}

export interface ChatMessagePayload {
  message: string;
  phone?: string;
  name?: string;
  businessType?: string;
  leadId?: string;
}

export interface ChatResponse {
  reply: string;
  quickActions: string[];
  suggestedAction: "ASK_PHONE" | "SCHEDULE_DEMO" | "SHOW_PRICING" | "GENERAL";
  leadId?: string | null;
  saved: boolean;
}

export interface LeadStats {
  total: number;
  newCount: number;
  scheduled: number;
  won: number;
}

// PÚBLICO: Crear lead desde Landing Page / Formulario de Citas / Catálogo Web
export const createLeadRequest = async (payload: CreateLeadPayload): Promise<Lead> => {
  const res = await API.post("/leads", payload);
  return res.data;
};

// PÚBLICO: Enviar mensaje al Asesor Think Virtual
export const sendChatMessageRequest = async (payload: ChatMessagePayload): Promise<ChatResponse> => {
  const res = await API.post("/leads/chat-message", payload);
  return res.data;
};

// PROTEGIDO: Obtener listado de prospectos para el CRM (filtrado por scope STORE | PLATFORM | ALL)
export const getLeadsRequest = async (status?: string, scope?: string): Promise<Lead[]> => {
  const res = await API.get("/leads", { params: { status, scope } });
  return res.data;
};

// PROTEGIDO: Estadísticas de leads por scope
export const getLeadStatsRequest = async (scope?: string): Promise<LeadStats> => {
  const res = await API.get("/leads/stats", { params: { scope } });
  return res.data;
};

// PROTEGIDO: Actualizar estado o notas de un prospecto
export const updateLeadRequest = async (id: string, data: Partial<Lead>): Promise<Lead> => {
  const res = await API.patch(`/leads/${id}`, data);
  return res.data;
};

// PROTEGIDO: Eliminar lead
export const deleteLeadRequest = async (id: string): Promise<void> => {
  await API.delete(`/leads/${id}`);
};
