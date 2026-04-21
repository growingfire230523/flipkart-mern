import apiClient from '../client';

export const getFragranceRecommendationApi = (answers: any) =>
  apiClient.post('/api/v1/fragrance-finder/recommend', answers);
