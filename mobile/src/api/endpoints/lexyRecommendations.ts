import apiClient from '../client';

export const getMilaariRecommendationsApi = (analysis: any) =>
  apiClient.post('/api/v1/lexy/recommendations', analysis);
