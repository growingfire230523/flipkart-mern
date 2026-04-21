import apiClient from '../client';

export const getAdminDashboardStatsApi = () =>
  apiClient.get('/api/v1/admin/dashboard/stats');

export const getAdminOrdersApi = () =>
  apiClient.get('/api/v1/admin/orders');

export const getAdminProductsApi = (params?: Record<string, string>) =>
  apiClient.get('/api/v1/admin/products', { params });

export const getAdminUsersApi = () =>
  apiClient.get('/api/v1/admin/users');

export const getAdminMailingListApi = () =>
  apiClient.get('/api/v1/admin/mailing-list');

export const getAdminReviewsApi = (productId: string) =>
  apiClient.get('/api/v1/admin/reviews', { params: { id: productId } });

export const deleteAdminReviewApi = (reviewId: string, productId: string) =>
  apiClient.delete('/api/v1/admin/reviews', { params: { id: reviewId, productId } });

export const getAdminHeroBannersApi = () =>
  apiClient.get('/api/v1/admin/home/hero-banners');

export const getAdminCommunityBannerApi = () =>
  apiClient.get('/api/v1/admin/home/banner');

export const getAdminNewInAdsApi = () =>
  apiClient.get('/api/v1/admin/home/new-in-ads');

export const getAdminPerfumePromoApi = () =>
  apiClient.get('/api/v1/admin/home/perfume-promo-banner');

export const getAdminMakeupPromoApi = () =>
  apiClient.get('/api/v1/admin/home/makeup-promo-banner');

export const getAdminSkincarePromoApi = () =>
  apiClient.get('/api/v1/admin/home/skincare-promo-banner');
