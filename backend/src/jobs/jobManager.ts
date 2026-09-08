import { ConversionJob, ConversionFile, JobStatus } from '../types';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// SSE client registry: jobId -> set of response writers
type SseWriter = (event: string, data: unknown) => void;

class JobManager {
  private jobs = new Map<string, ConversionJob>();
  private sseClients = new Map<string, Set<SseWriter>>();

  /** Create a new job and return it */
  createJob(jobId: string, files: ConversionFile[], clientIp?: string): ConversionJob {
    const now = Date.now();
    const job: ConversionJob = {
      jobId,
      status: 'queued',
      files,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + config.jobExpiryMinutes * 60 * 1000,
      clientIp,
    };
    this.jobs.set(jobId, job);
    logger.info(`Job created: ${jobId} with ${files.length} file(s)`);
    return job;
  }

  /** Get a job by ID */
  getJob(jobId: string): ConversionJob | undefined {
    return this.jobs.get(jobId);
  }

  /** Update job status and notify SSE clients */
  updateJobStatus(jobId: string, status: JobStatus): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    job.updatedAt = Date.now();
    this.broadcastJobUpdate(jobId, job);
  }

  /** Update an individual file within a job */
  updateFile(
    jobId: string,
    fileId: string,
    updates: Partial<ConversionFile>
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const file = job.files.find((f) => f.fileId === fileId);
    if (!file) return;
    Object.assign(file, updates);
    job.updatedAt = Date.now();

    // Recompute overall job status
    job.status = this.computeOverallStatus(job.files);

    this.broadcastJobUpdate(jobId, job);
  }

  /** Compute overall job status from individual file statuses */
  private computeOverallStatus(files: ConversionFile[]): JobStatus {
    const statuses = files.map((f) => f.status);
    if (statuses.every((s) => s === 'completed')) return 'completed';
    if (statuses.every((s) => s === 'failed')) return 'failed';
    if (statuses.some((s) => s === 'processing' || s === 'queued' || s === 'validating')) return 'processing';
    if (statuses.some((s) => s === 'completed')) return 'processing'; // mixed
    return 'processing';
  }

  /** Get all expired jobs (past their expiry time) */
  getExpiredJobs(now: number): ConversionJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.expiresAt < now);
  }

  /** Remove a job from memory */
  removeJob(jobId: string): void {
    this.jobs.delete(jobId);
    this.sseClients.delete(jobId);
  }

  /** Register an SSE client for a job */
  registerSseClient(jobId: string, writer: SseWriter): () => void {
    if (!this.sseClients.has(jobId)) {
      this.sseClients.set(jobId, new Set());
    }
    this.sseClients.get(jobId)!.add(writer);
    logger.debug(`SSE client registered for job ${jobId}`);

    // Return a cleanup function
    return () => {
      this.sseClients.get(jobId)?.delete(writer);
    };
  }

  /** Broadcast job update to all SSE clients watching this job */
  private broadcastJobUpdate(jobId: string, job: ConversionJob): void {
    const clients = this.sseClients.get(jobId);
    if (!clients || clients.size === 0) return;
    const payload = this.serializeJob(job);
    clients.forEach((writer) => {
      try {
        writer('job_update', payload);
      } catch {
        // Client disconnected, will be cleaned up
      }
    });
  }

  /** Serialize a job for the client (never expose paths) */
  serializeJob(job: ConversionJob) {
    return {
      jobId: job.jobId,
      status: job.status,
      files: job.files.map((f) => ({
        fileId: f.fileId,
        originalName: f.metadata.originalName,
        status: f.status,
        progress: f.progress,
        outputFormat: f.outputFormat,
        errorMessage: f.errorMessage,
        outputName: f.outputName,
        outputSizeBytes: f.outputSizeBytes,
        pageCount: f.pageCount,
        conversionTimeMs: f.conversionTimeMs,
        detectedMimeType: f.metadata.detectedMimeType,
        sizeBytes: f.metadata.sizeBytes,
        extension: f.metadata.extension,
      })),
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
    };
  }

  /** Get count of all active jobs */
  getJobCount(): number {
    return this.jobs.size;
  }
}

export const jobManager = new JobManager();
