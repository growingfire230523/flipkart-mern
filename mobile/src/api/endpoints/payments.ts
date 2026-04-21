import apiClient from '../client';

/** Amount in rupees (whole order total); backend converts to paise for Razorpay. */
export const createRazorpayOrderApi = (amount: number) =>
  apiClient.post('/api/v1/payment/process', { amount });

export const verifyRazorpayPaymentApi = (body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount: number;
  method?: string;
}) => apiClient.post('/api/v1/payment/verify', body);

export const codCheckApi = (pincode: string) =>
  apiClient.get('/api/v1/shipping/cod-check', { params: { pincode } });
