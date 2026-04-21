import apiClient from '../client';

export const getTestimonialsApi = () =>
  apiClient.get('/api/v1/testimonials');
