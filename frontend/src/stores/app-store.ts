import { create } from 'zustand';
import { api, type RepoStatus, type BranchInfo, type Settings } from '@/lib/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  // repo
  repoPath: string;
  repoStatus: RepoStatus | null;
  branches: BranchInfo[];
  settings: Settings | null;
  loading: boolean;
  backendReady: boolean;

  // ui
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toasts: Toast[];

  // actions
  setRepoPath: (path: string) => void;
  fetchStatus: () => Promise<void>;
  fetchBranches: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  checkBackend: () => Promise<void>;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  repoPath: '',
  repoStatus: null,
  branches: [],
  settings: null,
  loading: false,
  backendReady: false,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toasts: [],

  setRepoPath: (path) => set({ repoPath: path }),

  checkBackend: async () => {
    try {
      await api.health();
      set({ backendReady: true });
    } catch {
      set({ backendReady: false });
    }
  },

  fetchStatus: async () => {
    set({ loading: true });
    try {
      const status = await api.status();
      set({ repoStatus: status, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchBranches: async () => {
    try {
      const branches = await api.branches();
      set({ branches });
    } catch { /* no-op */ }
  },

  fetchSettings: async () => {
    try {
      const settings = await api.getSettings();
      set({ settings });
    } catch { /* no-op */ }
  },

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
