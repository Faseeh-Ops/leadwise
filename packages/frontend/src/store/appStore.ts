import { create } from 'zustand';
import { authApi, AuthUser } from '../api/auth';
import { Campaign } from '../api/campaigns';
import { Lead } from '../api/leads';

export interface QueueMetrics {
  waiting: number;
  active: number;
  failed: number;
}

export interface AllQueueMetrics {
  scrape: QueueMetrics;
  ai: QueueMetrics;
  send: QueueMetrics;
  timestamp?: string;
}

export interface ActivityEntry {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
  queue?: string;
  leadId?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: AuthUser | null;
  authLoading: boolean;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Campaigns
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  addCampaign: (campaign: Campaign) => void;
  removeCampaign: (id: string) => void;

  // Leads
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;

  // Queue metrics
  queueMetrics: AllQueueMetrics;
  setQueueMetrics: (metrics: AllQueueMetrics) => void;

  // Activity feed
  activityLog: ActivityEntry[];
  addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
  clearActivity: () => void;

  // Socket state
  isConnected: boolean;
  setConnected: (v: boolean) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  isAuthenticated: false,
  user: null,
  authLoading: true,

  checkAuth: async () => {
    try {
      const res = await authApi.me();
      set({ isAuthenticated: true, user: res.data.user, authLoading: false });
    } catch {
      set({ isAuthenticated: false, user: null, authLoading: false });
    }
  },

  login: async (username, password) => {
    const res = await authApi.login(username, password);
    set({ isAuthenticated: true, user: res.data.user });
  },

  logout: async () => {
    await authApi.logout();
    set({ isAuthenticated: false, user: null, campaigns: [], leads: [] });
  },

  // Campaigns
  campaigns: [],
  setCampaigns: (campaigns) => set({ campaigns }),
  updateCampaign: (id, data) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c._id === id ? { ...c, ...data } : c)),
    })),
  addCampaign: (campaign) =>
    set((state) => ({ campaigns: [campaign, ...state.campaigns] })),
  removeCampaign: (id) =>
    set((state) => ({ campaigns: state.campaigns.filter((c) => c._id !== id) })),

  // Leads
  leads: [],
  setLeads: (leads) => set({ leads }),
  updateLead: (id, data) =>
    set((state) => ({
      leads: state.leads.map((l) => (l._id === id ? { ...l, ...data } : l)),
    })),

  // Queue metrics
  queueMetrics: {
    scrape: { waiting: 0, active: 0, failed: 0 },
    ai: { waiting: 0, active: 0, failed: 0 },
    send: { waiting: 0, active: 0, failed: 0 },
  },
  setQueueMetrics: (metrics) => set({ queueMetrics: metrics }),

  // Activity feed
  activityLog: [],
  addActivity: (entry) =>
    set((state) => ({
      activityLog: [
        { ...entry, id: crypto.randomUUID(), timestamp: new Date() },
        ...state.activityLog.slice(0, 199), // Keep last 200
      ],
    })),
  clearActivity: () => set({ activityLog: [] }),

  // Socket
  isConnected: false,
  setConnected: (v) => set({ isConnected: v }),

  // Theme
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      return { theme: nextTheme };
    }),
}));

// Apply initial theme immediately
const initialTheme = localStorage.getItem('theme') || 'dark';
if (initialTheme === 'light') {
  document.documentElement.classList.add('light');
} else {
  document.documentElement.classList.remove('light');
}

