import apiClient from './client';

export interface AiGeneratedEmail {
  subject: string;
  body: string;
  painPoints: string[];
  tone: string;
  approved: boolean;
  approvedAt?: string;
  editedSubject?: string;
  editedBody?: string;
  stepIndex: number;
  sendDelay: number;
  sentAt?: string;
}

export interface Lead {
  _id: string;
  campaignId: string;
  targetUrl: string;
  companyName?: string;
  website?: string;
  industry?: string;
  employeeRange?: string;
  location?: string;
  description?: string;
  contactEmails: string[];
  emailSequence?: AiGeneratedEmail[];
  aiGeneratedEmail?: AiGeneratedEmail;
  sequenceStep: number;
  status: 'queued' | 'scraping' | 'ai_processing' | 'pending_review' | 'approved' | 'sent' | 'replied' | 'failed';
  retryCount: number;
  errorLog?: Array<{ timestamp: string; message: string; stack: string; queue?: string }>;
  sentAt?: string;
  repliedAt?: string;
  replySnippet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsResponse {
  success: boolean;
  data: Lead[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const leadsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; campaignId?: string; search?: string }) =>
    apiClient.get<LeadsResponse>('/leads', { params }),

  get: (id: string) => apiClient.get<{ success: boolean; data: Lead }>(`/leads/${id}`),

  updateEmail: (id: string, data: { editedSubject?: string; editedBody?: string; contactEmails?: string[]; stepIndex?: number }) =>
    apiClient.patch<{ success: boolean; data: Lead }>(`/leads/${id}/email`, data),

  approve: (id: string) =>
    apiClient.post<{ success: boolean; message: string; data: Lead }>(`/leads/${id}/approve`),

  markReplied: (id: string, replySnippet?: string) =>
    apiClient.post<{ success: boolean; data: Lead }>(`/leads/${id}/mark-replied`, { replySnippet }),

  delete: (id: string) => apiClient.delete(`/leads/${id}`),
};
