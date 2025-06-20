import { Router } from 'express';
import { CronJobController } from '../controllers/cronJobController';

const router = Router();

// Get cron job status
router.get('/status', CronJobController.getStatus);

// Start cron job
router.post('/start', CronJobController.startJob);

// Stop cron job
router.post('/stop', CronJobController.stopJob);

// Update cron job configuration
router.put('/config', CronJobController.updateConfig);

// Trigger manual sync
router.post('/trigger', CronJobController.triggerManualSync);

export default router;