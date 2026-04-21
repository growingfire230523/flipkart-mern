import apiClient from '../client';

export const newOrderApi = (order: any) =>
  apiClient.post('/api/v1/order/new', order);

export const myOrdersApi = () =>
  apiClient.get('/api/v1/orders/me');

export const getOrderDetailsApi = (id: string) =>
  apiClient.get(`/api/v1/order/${id}`);

export const getPaymentStatusApi = (id: string) =>
  apiClient.get(`/api/v1/payment/status/${id}`);
