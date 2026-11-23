import axios from './axios';

export const getSalesRequest = async (params?: any) => {
  const { data } = await axios.get('/sales', { params });
  return data;
};

export const getSaleRequest = async (id: string) => {
  const { data } = await axios.get(`/sales/${id}`);
  return data;
};

export const retrySaleBillingRequest = async (id: string) => {
  const { data } = await axios.post(`/sales/${id}/retry-billing`);
  return data;
};

export const issueSaleCreditNoteRequest = async (
  id: string,
  payload: { reasonCode: number; reasonText?: string; amount?: number }
) => {
  const { data } = await axios.post(`/sales/${id}/credit-note`, payload);
  return data;
};

export const issueSaleDebitNoteRequest = async (
  id: string,
  payload: { reasonCode: number; reasonText?: string; amount?: number }
) => {
  const { data } = await axios.post(`/sales/${id}/debit-note`, payload);
  return data;
};

export const deleteSaleRequest = async (
  id: string,
  options?: {
    method?: 'NOTA_CREDITO';
    motivo?: string;
    deliveredToClient?: boolean;
  },
) => {
  const { data } = await axios.delete(`/sales/${id}`, { data: options });
  return data;
};

export const smartEditSaleRequest = async (id: string, payload: any) => {
  const { data } = await axios.post(`/sales/${id}/smart-edit`, payload);
  return data;
};

export const manualNoteSaleRequest = async (id: string, payload: any) => {
  const { data } = await axios.post(`/sales/${id}/manual-note`, payload);
  return data;
};
