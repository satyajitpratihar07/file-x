import winston from 'winston';
import { config } from '../config/config';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp, requestId, jobId, ...meta }) => {
  const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const req = requestId ? ` [req:${requestId}]` : '';
  const job = jobId ? ` [job:${jobId}]` : '';
  return `${timestamp} ${level}${req}${job}: ${message}${extras}`;
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.nodeEnv === 'production' ? json() : combine(colorize(), devFormat)
  ),
  transports: [
    new winston.transports.Console(),
    ...(config.nodeEnv === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

export function createChildLogger(meta: Record<string, string>) {
  return logger.child(meta);
}
