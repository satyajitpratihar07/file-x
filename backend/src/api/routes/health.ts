import { Router, Request, Response } from 'express';
import { jobManager } from '../../jobs/jobManager';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ConvertX API', timestamp: new Date().toISOString() });
});

router.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    activeJobs: jobManager.getJobCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
