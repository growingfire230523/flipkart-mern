import apiClient from '../client';

export const getLexyRecommendationsApi = (analysis: any) =>
  apiClient.post('/api/v1/lexy/recommendations', analysis);
