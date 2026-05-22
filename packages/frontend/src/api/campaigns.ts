import apiClient from './client';

export type CampaignTone = 'professional' | 'conversational' | 'urgent';

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  targetUrls: string[];
  credentialId?: string;
  tone: CampaignTone;
  status: 'draft' | 'running' | 'paused' | 'completed';
  stats: { total: number; scraped: number; processed: number; sent: number; failed: number };
  createdAt: string;
  updatedAt: string;
}

export const campaignsApi = {
  list: () => apiClient.get<{ success: boolean; data: Campaign[] }>('/campaigns'),

  get: (id: string) => apiClient.get<{ success: boolean; data: Campaign }>(`/campaigns/${id}`),

  create: (data: { name: string; description?: string; targetUrls: string[]; credentialId?: string; tone?: CampaignTone }) =>
    apiClient.post<{ success: boolean; data: Campaign }>('/campaigns', data),

  update: (id: string, data: Partial<Campaign>) =>
    apiClient.patch<{ success: boolean; data: Campaign }>(`/campaigns/${id}`, data),

  delete: (id: string) => apiClient.delete(`/campaigns/${id}`),

  start: (id: string) => apiClient.post<{ success: boolean; message: string; jobsEnqueued: number }>(`/campaigns/${id}/start`),

  pause: (id: string) => apiClient.post(`/campaigns/${id}/pause`),

  uploadCsv: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ success: boolean; message: string; urlsImported: number }>(
      `/campaigns/${id}/upload-csv`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
