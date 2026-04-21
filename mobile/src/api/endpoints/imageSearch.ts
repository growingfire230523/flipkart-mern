import apiClient from '../client';

export const imageSearchApi = (imageData: FormData) =>
  apiClient.post('/api/v1/image-search', imageData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
