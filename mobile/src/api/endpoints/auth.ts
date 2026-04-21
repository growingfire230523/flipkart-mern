import apiClient from '../client';

export const loginApi = (email: string, password: string) =>
  apiClient.post('/api/v1/login', { email, password });

export const registerApi = (userData: FormData) =>
  apiClient.post('/api/v1/register', userData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const loadUserApi = () =>
  apiClient.get('/api/v1/me');

export const logoutApi = () =>
  apiClient.get('/api/v1/logout');

export const updateProfileApi = (userData: FormData) =>
  apiClient.put('/api/v1/me/update', userData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updatePasswordApi = (passwords: { oldPassword: string; newPassword: string; confirmPassword: string }) =>
  apiClient.put('/api/v1/password/update', passwords);

export const forgotPasswordApi = (email: string) =>
  apiClient.post('/api/v1/password/forgot', { email });

export const resetPasswordApi = (token: string, passwords: { password: string; confirmPassword: string }) =>
  apiClient.put(`/api/v1/password/reset/${token}`, passwords);

export const googleLoginApi = (credential: string) =>
  apiClient.post('/api/v1/oauth/google', { credential });

export const phoneLoginVerifyApi = (phone: string, otp: string) =>
  apiClient.post('/api/v1/phone/login/verify', { phone, otp });

export const phoneLoginRequestApi = (phone: string) =>
  apiClient.post('/api/v1/phone/login/otp', { phone });
