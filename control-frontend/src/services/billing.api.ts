import axios from './axios';

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
  billingSerieBoleta?: string;
  billingSerieInvoice?: string;
  hasToken: boolean;
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
}) => {
  const { data } = await axios.put('/billing/config', config);
  return data;
};

export const syncSeriesRequest = async (payload: {
  serieBoleta?: string;
  serieFactura?: string;
  initialBoletaNumber?: number;
  initialFacturaNumber?: number;
}) => {
  const { data } = await axios.post('/billing/sync-series', payload);
  return data;
};
