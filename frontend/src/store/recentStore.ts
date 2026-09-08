import { create } from 'zustand';
import type { OutputFormat } from '../types';

export interface RecentItem {
  id: string;
  jobId: string;
  fileId: string;
  originalName: string;
  outputName: string;
  outputFormat: OutputFormat;
  sizeBytes: number;
  outputSizeBytes?: number;
  timestamp: number;
}

interface RecentStore {
  recentItems: RecentItem[];
  addRecentItem: (item: Omit<RecentItem, 'id' | 'timestamp'>) => void;
  removeRecentItem: (id: string) => void;
  clearRecentItems: () => void;
}

const STORAGE_KEY = 'convertx_recent_conversions_v1';

const loadFromStorage = (): RecentItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveToStorage = (items: RecentItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 15)));
  } catch {
    // Ignore storage quota errors
  }
};

export const useRecentStore = create<RecentStore>((set, get) => ({
  recentItems: loadFromStorage(),

  addRecentItem: (item) => {
    const newItem: RecentItem = {
      ...item,
      id: `${item.jobId}-${item.fileId}-${Date.now()}`,
      timestamp: Date.now(),
    };

    // Filter out duplicates with same jobId & fileId
    const current = get().recentItems.filter(
      (r) => !(r.jobId === item.jobId && r.fileId === item.fileId)
    );

    const updated = [newItem, ...current].slice(0, 15);
    set({ recentItems: updated });
    saveToStorage(updated);
  },

  removeRecentItem: (id) => {
    const updated = get().recentItems.filter((r) => r.id !== id);
    set({ recentItems: updated });
    saveToStorage(updated);
  },

  clearRecentItems: () => {
    set({ recentItems: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));
