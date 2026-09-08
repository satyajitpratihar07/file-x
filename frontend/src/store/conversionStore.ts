import { create } from 'zustand';
import type { JobState, OutputFormat } from '../types';
import { apiService } from '../services/api';
import { subscribeToJobEvents } from '../services/sseClient';
import { useRecentStore } from './recentStore';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ConversionStore {
  // Files selected by user (pre-upload)
  selectedFiles: File[];
  outputFormat: OutputFormat;

  // Active job state
  currentJob: JobState | null;
  uploadProgress: number;
  isUploading: boolean;
  isConverting: boolean;

  // Toast notifications
  toasts: Toast[];

  // Actions
  setSelectedFiles: (files: File[]) => void;
  addSelectedFiles: (files: File[]) => void;
  removeSelectedFile: (index: number) => void;
  clearSelectedFiles: () => void;
  setOutputFormat: (format: OutputFormat) => void;

  uploadAndConvert: () => Promise<void>;
  updateJobFromServer: (job: JobState) => void;
  deleteCurrentJob: () => Promise<void>;
  reset: () => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let sseCleanup: (() => void) | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

const stopSync = () => {
  if (sseCleanup) { sseCleanup(); sseCleanup = null; }
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
};

export const useConversionStore = create<ConversionStore>((set, get) => ({
  selectedFiles: [],
  outputFormat: 'pdf',
  currentJob: null,
  uploadProgress: 0,
  isUploading: false,
  isConverting: false,
  toasts: [],

  setSelectedFiles: (files) => set({ selectedFiles: files }),

  addSelectedFiles: (newFiles) => {
    const { selectedFiles } = get();
    const existing = new Set(selectedFiles.map((f) => `${f.name}-${f.size}`));
    const unique = newFiles.filter((f) => !existing.has(`${f.name}-${f.size}`));
    set({ selectedFiles: [...selectedFiles, ...unique] });
  },

  removeSelectedFile: (index) => {
    const { selectedFiles } = get();
    set({ selectedFiles: selectedFiles.filter((_, i) => i !== index) });
  },

  clearSelectedFiles: () => set({ selectedFiles: [] }),

  setOutputFormat: (format) => set({ outputFormat: format }),

  uploadAndConvert: async () => {
    const { selectedFiles, outputFormat } = get();
    if (selectedFiles.length === 0) return;

    set({ isUploading: true, uploadProgress: 0, currentJob: null });

    try {
      const response = await apiService.uploadFiles(
        selectedFiles,
        outputFormat,
        (pct) => set({ uploadProgress: pct })
      );

      set({
        isUploading: false,
        isConverting: true,
        currentJob: response as unknown as JobState,
      });

      // Show validation errors if any
      if (response.validationErrors?.length) {
        response.validationErrors.forEach((e) => {
          get().addToast({
            type: 'warning',
            message: `${e.name}: ${e.error}`,
            duration: 6000,
          });
        });
      }

      stopSync();

      // Subscribe to SSE for real-time updates
      sseCleanup = subscribeToJobEvents(response.jobId, (job) => {
        get().updateJobFromServer(job);
      });

      // Polling fallback every 800ms
      pollInterval = setInterval(async () => {
        try {
          const updated = await apiService.getJobStatus(response.jobId);
          get().updateJobFromServer(updated);
        } catch {
          // ignore transient poll errors
        }
      }, 800);
    } catch (err) {
      set({ isUploading: false, isConverting: false });
      get().addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
      });
    }
  },

  updateJobFromServer: (job) => {
    set({ currentJob: job });

    const allDone = job.files.every(
      (f) => f.status === 'completed' || f.status === 'failed'
    );

    if (allDone) {
      stopSync();
      set({ isConverting: false });

      // Save completed files to recent conversions history
      const { addRecentItem } = useRecentStore.getState();
      job.files.forEach((f) => {
        if (f.status === 'completed') {
          addRecentItem({
            jobId: job.jobId,
            fileId: f.fileId,
            originalName: f.originalName,
            outputName: f.outputName || f.originalName,
            outputFormat: f.outputFormat,
            sizeBytes: f.sizeBytes,
            outputSizeBytes: f.outputSizeBytes,
          });
        }
      });

      const completed = job.files.filter((f) => f.status === 'completed').length;
      const failed = job.files.filter((f) => f.status === 'failed').length;

      if (failed === 0) {
        get().addToast({ type: 'success', message: `${completed} file(s) converted successfully!` });
      } else if (completed === 0) {
        get().addToast({ type: 'error', message: `All ${failed} file(s) failed to convert.` });
      } else {
        get().addToast({
          type: 'warning',
          message: `${completed} succeeded, ${failed} failed.`,
        });
      }
    }
  },

  deleteCurrentJob: async () => {
    const { currentJob } = get();
    if (!currentJob) return;
    try {
      await apiService.deleteJob(currentJob.jobId);
    } catch {
      // Ignore errors on delete
    }
    if (sseCleanup) { sseCleanup(); sseCleanup = null; }
    set({ currentJob: null, isConverting: false });
  },

  reset: () => {
    if (sseCleanup) { sseCleanup(); sseCleanup = null; }
    set({
      selectedFiles: [],
      currentJob: null,
      uploadProgress: 0,
      isUploading: false,
      isConverting: false,
    });
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 5000;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
