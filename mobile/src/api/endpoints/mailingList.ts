import apiClient from '../client';

type SubscribePayload = {
  email: string;
  phone?: string;
};

export const subscribeMailingListApi = ({ email, phone }: SubscribePayload) =>
  apiClient.post('/api/v1/mailing-list/subscribe', { email, phone });
