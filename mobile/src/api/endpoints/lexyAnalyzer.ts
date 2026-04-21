import apiClient from '../client';

export const analyzeFaceApi = (imageData: FormData) =>
  apiClient.post('/api/v1/lexy/analyze-face', imageData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
