import apiClient from '../client';

export const getProductsApi = (params: Record<string, string>) =>
  apiClient.get('/api/v1/products', { params });

export const getProductDetailsApi = (id: string) =>
  apiClient.get(`/api/v1/product/${id}`);

export const getSliderProductsApi = () =>
  apiClient.get('/api/v1/products/all?limit=48');

export const newReviewApi = (reviewData: any) =>
  apiClient.put('/api/v1/review', reviewData);

export const getTopRatedApi = () =>
  apiClient.get('/api/v1/products/top-rated?limit=12');

export const getNewInApi = () =>
  apiClient.get('/api/v1/products/new-in?limit=3');

export const getBestSellersApi = () =>
  apiClient.get('/api/v1/products/best-sellers?limit=8');

export const getMakeKitApi = (query: string, size = 6) =>
  apiClient.get('/api/v1/products/make-kit', { params: { query, size } });

export const getSuggestProductsApi = (keyword: string) =>
  apiClient.get('/api/v1/products/suggest', { params: { keyword } });
