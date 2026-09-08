import type { JobState } from '../types';
import { BASE_URL } from './api';

type SseCallback = (job: JobState) => void;

/**
 * Subscribe to Server-Sent Events for a job.
 * Returns a cleanup function to close the connection.
 */
export function subscribeToJobEvents(jobId: string, onUpdate: SseCallback): () => void {
  const url = `${BASE_URL}/api/jobs/${jobId}/events`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('job_update', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onUpdate(data as JobState);
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  });

  eventSource.addEventListener('connected', () => {
    console.debug(`SSE connected for job ${jobId}`);
  });

  eventSource.onerror = (err) => {
    // EventSource will auto-reconnect; log for debugging
    console.debug(`SSE error for job ${jobId}:`, err);
  };

  return () => {
    eventSource.close();
  };
}
