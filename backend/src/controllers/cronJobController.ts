import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/responseHandler';
import CronJobService from '../services/cronJobService';

export class CronJobController {
  /**
   * Get cron job status
   */
  static getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = CronJobService.getStatus();
      sendSuccess(res, status, 'Cron job status retrieved successfully');
    } catch (error) {
      console.error('Get cron status error:', error);
      sendError(res, 'Failed to get cron job status', 500, (error as Error).message);
    }
  };

  /**
   * Start cron job
   */
  static startJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schedule, timezone } = req.body;
      
      const config = {
        schedule: schedule || process.env.CRON_SCHEDULE || '0 2 * * *',
        enabled: true,
        timezone: timezone || 'UTC'
      };

      const success = CronJobService.startJob(config);
      
      if (success) {
        const status = CronJobService.getStatus();
        sendSuccess(res, status, 'Cron job started successfully');
      } else {
        sendError(res, 'Failed to start cron job', 400);
      }
    } catch (error) {
      console.error('Start cron job error:', error);
      sendError(res, 'Failed to start cron job', 500, (error as Error).message);
    }
  };

  /**
   * Stop cron job
   */
  static stopJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const success = CronJobService.stopJob();
      
      if (success) {
        const status = CronJobService.getStatus();
        sendSuccess(res, status, 'Cron job stopped successfully');
      } else {
        sendError(res, 'Failed to stop cron job', 400);
      }
    } catch (error) {
      console.error('Stop cron job error:', error);
      sendError(res, 'Failed to stop cron job', 500, (error as Error).message);
    }
  };

  /**
   * Update cron job configuration
   */
  static updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schedule, enabled, timezone } = req.body;

      if (!schedule || typeof enabled !== 'boolean') {
        sendError(res, 'Schedule and enabled status are required', 400);
        return;
      }

      const config = {
        schedule,
        enabled,
        timezone: timezone || 'UTC'
      };

      const success = CronJobService.updateConfig(config);
      
      if (success) {
        const status = CronJobService.getStatus();
        sendSuccess(res, status, 'Cron job configuration updated successfully');
      } else {
        sendError(res, 'Failed to update cron job configuration', 400);
      }
    } catch (error) {
      console.error('Update cron config error:', error);
      sendError(res, 'Failed to update cron job configuration', 500, (error as Error).message);
    }
  };

  /**
   * Trigger manual sync
   */
  static triggerManualSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const success = await CronJobService.triggerManualSync();
      
      if (success) {
        const status = CronJobService.getStatus();
        sendSuccess(res, status, 'Manual sync triggered successfully');
      } else {
        sendError(res, 'Failed to trigger manual sync', 400);
      }
    } catch (error) {
      console.error('Trigger manual sync error:', error);
      sendError(res, 'Failed to trigger manual sync', 500, (error as Error).message);
    }
  };
}