import axios from 'axios';
import type { ApiResponse, UploadResponse, JobState, SupportedFormat, OutputFormat } from '../types';
import { getClientBlob } from './clientConverter';

export const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.message ||
      'Network error. Please check your connection.';
    return Promise.reject(new Error(message));
  }
);

export const apiService = {
  /**
   * Upload files and create a conversion job.
   */
  async uploadFiles(
    files: File[],
    outputFormat: OutputFormat,
    onProgress?: (percent: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('outputFormat', outputFormat);

    const res = await api.post<ApiResponse<UploadResponse>>('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Upload failed');
    }
    return res.data.data;
  },

  /**
   * Poll job status.
   */
  async getJobStatus(jobId: string): Promise<JobState> {
    const res = await api.get<ApiResponse<JobState>>(`/api/jobs/${jobId}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to get job status');
    }
    return res.data.data;
  },

  /**
   * Delete a job and its files.
   */
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/api/jobs/${jobId}`);
  },

  /**
   * Get download URL for a single file.
   */
  getFileDownloadUrl(jobId: string, fileId: string): string {
    const clientBlob = getClientBlob(fileId);
    if (clientBlob) {
      return URL.createObjectURL(clientBlob);
    }
    return `${BASE_URL}/api/download/${jobId}/${fileId}`;
  },

  /**
   * Get ZIP download URL for all files.
   */
  getZipDownloadUrl(jobId: string): string {
    return `${BASE_URL}/api/download/${jobId}/zip`;
  },

  /**
   * Get all supported formats from the backend.
   */
  async getSupportedFormats(): Promise<{ formats: SupportedFormat[]; grouped: Record<string, SupportedFormat[]> }> {
    const res = await api.get<ApiResponse<{ formats: SupportedFormat[]; grouped: Record<string, SupportedFormat[]> }>>('/api/formats');
    if (!res.data.success || !res.data.data) {
      throw new Error('Failed to fetch formats');
    }
    return res.data.data;
  },
};
