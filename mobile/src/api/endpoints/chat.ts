import apiClient from '../client';

export const sendChatMessageApi = (message: string, history?: any[], memory?: any) =>
  apiClient.post('/api/v1/chat', { message, history, memory }, { timeout: 25000 });
