import apiClient from '../client';

export const getHeroBannersApi = () =>
  apiClient.get('/api/v1/home/hero-banners');

export const getPerfumePromoBannerApi = () =>
  apiClient.get('/api/v1/home/perfume-promo-banner');

export const getMakeupPromoBannerApi = () =>
  apiClient.get('/api/v1/home/makeup-promo-banner');

export const getSkincarePromoBannerApi = () =>
  apiClient.get('/api/v1/home/skincare-promo-banner');

export const getDealsApi = (limit?: number) =>
  apiClient.get(`/api/v1/deals${limit ? `?limit=${limit}` : ''}`);

export const getDealsConfigApi = () =>
  apiClient.get('/api/v1/deals/config');

export const getNewInAdsApi = () =>
  apiClient.get('/api/v1/home/new-in-ads');

export const getCommunityBannerApi = () =>
  apiClient.get('/api/v1/home/banner');
