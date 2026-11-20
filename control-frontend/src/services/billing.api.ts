import axios from './axios';
import { resolveLocationFromUbigeoOrAddress } from '../utils/fiscalUtils';

export interface BillingItem {
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  igvType?: number; // 1 = Gravado, 8 = Exonerado, 9 = Inafecto
  igvAffectation?: string; // "10", "10_MYPE", "20", "30", "40"
  igvRate?: number; // 18.0, 10.0, 0.0
}

export interface EmitBillingPayload {
  docType: 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
  customerDocType: string;
  customerDocNum: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  currency?: 'PEN' | 'USD';
  items: BillingItem[];
  paymentMethod?: string;
  paymentType?: 'CONTADO' | 'CREDITO';
  issueDate?: string;
  dueDate?: string;
  cuotas?: Array<{ cuota: number; fecha: string; monto: number }>;
  serie?: string;
  saleId?: string;
  branchId?: string;
  notes?: string;
  observaciones?: string;
}

export interface IssueNotePayload {
  originalFiscalDocumentId: string;
  noteType: 'CREDIT' | 'DEBIT';
  reasonCode: number;
  reasonText: string;
  amount?: number;
}

export interface FiscalDocument {
  id: string;
  docType: 'INVOICE' | 'BOLETA' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'DISPATCH_GUIDE';
  serie: string;
  correlative: number;
  fullNumber: string;
  status: 'LOCAL_DRAFT' | 'QUEUED_OUTBOX' | 'PROCESSING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  issuerRuc: string;
  customerDocType: string;
  customerDocNum: string;
  customerName: string;
  customerAddress?: string;
  totalOpGravada: number;
  totalOpInafecta: number;
  totalOpExonerada: number;
  totalIgv: number;
  totalAmount: number;
  currency: 'PEN' | 'USD' | 'EUR';
  hash?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  cdrUrl?: string;
  sunatResponseCode?: string;
  sunatDescription?: string;
  saleId?: string;
  branchId?: string;
  branch?: { id: string; name: string };
  sale?: {
    id: string;
    code?: string;
    paymentMethod: string;
    items?: any[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface BillingStats {
  totalEmitted: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  acceptanceRate: number;
  totalInvoicedPen: number;
  totalInvoicedUsd: number;
  totalIgvPen: number;
  totalGravadaPen: number;
  totalExoneradaPen: number;
  breakdownByType: {
    INVOICE: { count: number; total: number };
    BOLETA: { count: number; total: number };
    CREDIT_NOTE: { count: number; total: number };
    DEBIT_NOTE: { count: number; total: number };
    DISPATCH_GUIDE: { count: number; total: number };
  };
  credentialsConfigured: boolean;
  issuerRuc: string;
  issuerName: string;
}

export interface BillingConfig {
  hasElectronicBilling: boolean;
  businessRuc: string;
  businessReason: string;
  businessName: string;
  ccofactUrl?: string;
  ccofactApiKey?: string;
  nubefactUrl?: string;
  hasToken: boolean;
  billingSerieBoleta?: string;
  billingSerieInvoice?: string;
  serieNotaCreditoBoleta?: string;
  serieNotaCreditoFactura?: string;
  serieNotaDebitoBoleta?: string;
  serieNotaDebitoFactura?: string;
  initialBoletaNumber?: number;
  initialFacturaNumber?: number;
  initialNcBoletaNumber?: number;
  initialNcFacturaNumber?: number;
  initialNdBoletaNumber?: number;
  initialNdFacturaNumber?: number;
}

export const getBillingStatsRequest = async (): Promise<BillingStats> => {
  const { data } = await axios.get('/billing/stats');
  return data;
};

export const getBillingDocumentsRequest = async (params?: {
  docType?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<FiscalDocument[]> => {
  const { data } = await axios.get('/billing/documents', { params });
  return data;
};

export const getBillingDocumentRequest = async (id: string): Promise<FiscalDocument> => {
  const { data } = await axios.get(`/billing/documents/${id}`);
  return data;
};

export const emitBillingDocumentRequest = async (payload: EmitBillingPayload) => {
  const { data } = await axios.post('/billing/emit', payload);
  return data;
};

export const retryBillingDocumentRequest = async (id: string) => {
  const { data } = await axios.post(`/billing/retry/${id}`);
  return data;
};

export const issueBillingNoteRequest = async (payload: IssueNotePayload) => {
  const { data } = await axios.post('/billing/note', payload);
  return data;
};

export const updateBillingDocumentRequest = async (id: string, payload: any) => {
  const { data } = await axios.put(`/billing/documents/${id}`, payload);
  return data;
};

export const deleteBillingDocumentRequest = async (
  id: string,
  options?: { motivo?: string; forceDelete?: boolean; restoreStock?: boolean },
) => {
  const { data } = await axios.delete(`/billing/documents/${id}`, { data: options });
  return data;
};

export const testCcofactConnectionRequest = async () => {
  const { data } = await axios.post('/billing/test-connection');
  return data;
};

export const testBillingSandboxRequest = async () => {
  const { data } = await axios.post('/billing/simulate-sandbox');
  return data;
};

export const getBillingConfigRequest = async (): Promise<BillingConfig> => {
  const { data } = await axios.get('/billing/config');
  return data;
};

export const updateBillingConfigRequest = async (config: {
  hasElectronicBilling?: boolean;
  businessRuc?: string;
  businessReason?: string;
  businessName?: string;
  ccofactUrl?: string;
  ccofactApiKey?: string;
  billingSerieBoleta?: string;
  billingSerieInvoice?: string;
  nubefactUrl?: string;
  nubefactToken?: string;
}) => {
  const { data } = await axios.put('/billing/config', config);
  return data;
};

export const syncSeriesRequest = async (payload: {
  serieBoleta?: string;
  serieFactura?: string;
  serieNotaCreditoBoleta?: string;
  serieNotaCreditoFactura?: string;
  serieNotaDebitoBoleta?: string;
  serieNotaDebitoFactura?: string;
  initialBoletaNumber?: number;
  initialFacturaNumber?: number;
  initialNcBoletaNumber?: number;
  initialNcFacturaNumber?: number;
  initialNdBoletaNumber?: number;
  initialNdFacturaNumber?: number;
}) => {
  const { data } = await axios.post('/billing/sync-series', payload);
  return data;
};

export const consultarRucRequest = async (ruc: string): Promise<{
  success: boolean;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  estado: string;
  condicion: string;
  email?: string;
  telefono?: string;
}> => {
  const cleanRuc = (ruc || '').trim().replace(/\D/g, '');
  if (!cleanRuc || cleanRuc.length !== 11) {
    throw new Error('El RUC debe tener exactamente 11 dígitos numéricos.');
  }

  // 1. Intentar a través del backend del sistema (sin restricciones de CORS de navegador)
  try {
    const { data } = await axios.get(`/billing/consultar-ruc/${cleanRuc}`);
    if (data && data.success && data.razonSocial) {
      const loc = resolveLocationFromUbigeoOrAddress(
        data.ubigeo,
        data.direccion && data.direccion !== '-' ? data.direccion : ''
      );
      return {
        ...data,
        direccion: loc.cleanAddress || data.direccion || '',
        departamento: data.departamento || loc.departamento,
        provincia: data.provincia || loc.provincia,
        distrito: data.distrito || loc.distrito,
      };
    }
  } catch (backendErr: any) {
    console.warn('Backend /billing/consultar-ruc en espera o no disponible, usando pasarela directa SUNAT...');
  }

  // 2. Pasarela directa OpenRUC (ultra rápida, sin captcha, compatible CORS en navegador para RUC 20)
  if (cleanRuc.startsWith('20')) {
    try {
      const resOpen = await fetch(`https://openruc.com/api/ruc/${cleanRuc}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4500),
      });
      if (resOpen.ok) {
        const openData = await resOpen.json();
        if (openData && (openData.razon_social || openData.nombre_o_razon_social)) {
          const razon = openData.razon_social || openData.nombre_o_razon_social || '';
          const rawAddress = openData.direccion || openData.direccion_completa || '';
          const loc = resolveLocationFromUbigeoOrAddress(openData.ubigeo, rawAddress);
          return {
            success: true,
            ruc: cleanRuc,
            razonSocial: razon,
            nombreComercial: openData.nombre_comercial || razon,
            direccion: loc.cleanAddress || rawAddress,
            departamento: openData.departamento || loc.departamento,
            provincia: openData.provincia || loc.provincia,
            distrito: openData.distrito || loc.distrito,
            ubigeo: openData.ubigeo || '',
            estado: openData.estado || 'ACTIVO',
            condicion: openData.condicion || 'HABIDO',
          };
        }
      }
    } catch (_) {}
  }

  // 3. Pasarela directa de alta disponibilidad (APIs Perú / SUNAT)
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.nombre || data.razonSocial)) {
        const razon = data.nombre || data.razonSocial || '';
        const rawAddress = data.direccion && data.direccion !== '-' ? data.direccion : '';
        const loc = resolveLocationFromUbigeoOrAddress(data.ubigeo, rawAddress);
        return {
          success: true,
          ruc: cleanRuc,
          razonSocial: razon,
          nombreComercial: data.nombreComercial || razon,
          direccion: loc.cleanAddress || rawAddress,
          departamento: data.departamento || loc.departamento,
          provincia: data.provincia || loc.provincia,
          distrito: data.distrito || loc.distrito,
          ubigeo: data.ubigeo && data.ubigeo !== '-' ? data.ubigeo : '',
          estado: data.estado || 'ACTIVO',
          condicion: data.condicion || 'HABIDO',
        };
      }
    }
  } catch (apiErr) {
    console.warn('Error en pasarela primaria SUNAT...');
  }

  // 4. Si es RUC 10, consultar DNI en RENIEC como rescate oficial de nombres
  if (cleanRuc.startsWith('10')) {
    const dni = cleanRuc.substring(2, 10);
    try {
      const resDni = await fetch(`https://api.apis.net.pe/v1/dni?numero=${dni}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (resDni.ok) {
        const dniData = await resDni.json();
        const fullName = `${dniData.nombres || ''} ${dniData.apellidoPaterno || ''} ${dniData.apellidoMaterno || ''}`.trim();
        if (fullName) {
          return {
            success: true,
            ruc: cleanRuc,
            razonSocial: fullName,
            nombreComercial: fullName,
            direccion: '',
            departamento: '',
            provincia: '',
            distrito: '',
            ubigeo: '',
            estado: 'ACTIVO',
            condicion: 'HABIDO',
          };
        }
      }
    } catch (_) {}
  }

  throw new Error(`No se encontraron datos en SUNAT para el RUC ${cleanRuc}. Verifique el número ingresado.`);
};
