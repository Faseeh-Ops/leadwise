import apiClient from './client';

export interface Credential {
  _id: string;
  label: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string;
  createdAt: string;
}

export interface CreateCredentialInput {
  label: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string;
  groqApiKey: string;
}

export const credentialsApi = {
  list: () => apiClient.get<{ success: boolean; data: Credential[] }>('/credentials'),

  create: (data: CreateCredentialInput) =>
    apiClient.post<{ success: boolean; data: Credential }>('/credentials', data),

  delete: (id: string) => apiClient.delete(`/credentials/${id}`),
};
