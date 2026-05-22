import apiClient from './client';

export interface AuthUser { username: string }

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ success: boolean; user: AuthUser }>('/auth/login', { username, password }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<{ success: boolean; user: AuthUser }>('/auth/me'),

  refresh: () => apiClient.post('/auth/refresh'),
};
