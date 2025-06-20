import cron, { ScheduledTask } from 'node-cron';
import DataSyncService from './dataSyncService';
import Student, { IStudentDocument } from '../models/Student';

export interface CronJobStatus {
  isRunning: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: {
    success: boolean;
    studentsProcessed: number;
    errors: number;
    duration: number;
  };
  schedule: string;
  enabled: boolean;
}

export interface CronJobConfig {
  schedule: string;
  enabled: boolean;
  timezone?: string;
}

export class CronJobService {
  private static cronTask: ScheduledTask | null = null;
  private static jobStatus: CronJobStatus = {
    isRunning: false,
    schedule: process.env.CRON_SCHEDULE || '0 2 * * *',
    enabled: false
  };

  /**
   * Initialize and start the cron job system
   */
  static initialize(): void {
    console.log('🕐 Initializing Cron Job Service...');
    
    const config: CronJobConfig = {
      schedule: process.env.CRON_SCHEDULE || '0 2 * * *',
      enabled: process.env.CRON_ENABLED !== 'false',
      timezone: process.env.CRON_TIMEZONE || 'UTC'
    };

    this.jobStatus.schedule = config.schedule;
    this.jobStatus.enabled = config.enabled;

    if (config.enabled) {
      this.startJob(config);
    }

    console.log(`✅ Cron Job Service initialized`);
    console.log(`📅 Schedule: ${config.schedule} (${config.timezone})`);
    console.log(`🟢 Enabled: ${config.enabled}`);
  }

  /**
   * Start the cron job with given configuration
   */
  static startJob(config: CronJobConfig): boolean {
    try {
      this.stopJob();

      console.log(`🚀 Starting cron job with schedule: ${config.schedule}`);

      if (!cron.validate(config.schedule)) {
        throw new Error(`Invalid cron schedule: ${config.schedule}`);
      }

      this.cronTask = cron.schedule(
        config.schedule,
        () => this.executeSync(true),
        {
          timezone: config.timezone || 'UTC'
        }
      );

      this.jobStatus = {
        ...this.jobStatus,
        enabled: true,
        schedule: config.schedule,
        nextRun: this.calculateNextRun()
      };

      console.log(`✅ Cron job started successfully`);
      console.log(`⏰ Next run: ${this.jobStatus.nextRun?.toISOString()}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to start cron job:', error);
      this.jobStatus.enabled = false;
      return false;
    }
  }

  /**
   * Stop the running cron job
   */
  static stopJob(): boolean {
    try {
      if (this.cronTask) {
        this.cronTask.stop();
        this.cronTask.destroy();
        this.cronTask = null;
        console.log('🛑 Cron job stopped');
      }

      this.jobStatus.enabled = false;
      this.jobStatus.nextRun = undefined;
      return true;
    } catch (error) {
      console.error('❌ Failed to stop cron job:', error);
      return false;
    }
  }

  /**
   * Execute the data synchronization job
   */
  private static async executeSync(forceAll: boolean = false): Promise<void> {
    if (this.jobStatus.isRunning) {
      console.log('⚠️ Sync job already running, skipping...');
      return;
    }

    const startTime = Date.now();
    this.jobStatus.isRunning = true;
    this.jobStatus.lastRun = new Date();

    console.log('🔄 Starting automated data sync...');

    try {
      const studentsNeedingUpdate = forceAll 
        ? await this.getAllStudents()
        : await this.getStudentsNeedingUpdate();
      
      console.log(`📋 Found ${studentsNeedingUpdate.length} students ${forceAll ? 'for scheduled sync' : 'needing updates'}`);

      if (studentsNeedingUpdate.length === 0) {
        console.log('✅ No students to process');
        this.jobStatus.lastResult = {
          success: true,
          studentsProcessed: 0,
          errors: 0,
          duration: Date.now() - startTime
        };
        return;
      }

      let processed = 0;
      let errors = 0;

      for (const student of studentsNeedingUpdate) {
        try {
          console.log(`🔄 Syncing student: ${student.name} (${student.codeforcesHandle})`);
          
          const result = await DataSyncService.syncStudentData(student._id?.toString() ?? '');
          
          if (result.success) {
            processed++;
            console.log(`✅ Successfully synced ${student.codeforcesHandle}`);
          } else {
            errors++;
            console.log(`❌ Failed to sync ${student.codeforcesHandle}: ${result.message}`);
          }

          await this.delay(1000);

        } catch (error) {
          errors++;
          console.error(`❌ Error syncing ${student.codeforcesHandle}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.jobStatus.lastResult = {
        success: errors === 0,
        studentsProcessed: processed,
        errors,
        duration
      };

      console.log(`✅ Automated sync completed:`);
      console.log(`   📊 Students processed: ${processed}`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log(`   ⏱️ Duration: ${Math.round(duration / 1000)}s`);

    } catch (error) {
      console.error('❌ Automated sync failed:', error);
      this.jobStatus.lastResult = {
        success: false,
        studentsProcessed: 0,
        errors: 1,
        duration: Date.now() - startTime
      };
    } finally {
      this.jobStatus.isRunning = false;
      this.jobStatus.nextRun = this.calculateNextRun();
    }
  }

  /**
   * Get ALL students (for scheduled syncs)
   */
  private static async getAllStudents(): Promise<IStudentDocument[]> {
    return await Student.find({});
  }

  /**
   * Get students that need data updates (for manual syncs)
   */
  private static async getStudentsNeedingUpdate(): Promise<IStudentDocument[]> {
    const hoursThreshold = parseInt(process.env.SYNC_THRESHOLD_HOURS || '24');
    const thresholdTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    
    return await Student.find({
      $or: [
        { lastDataUpdate: null },
        { lastDataUpdate: { $lt: thresholdTime } }
      ]
    });
  }

  /**
   * Calculate next run time (simplified approach)
   */
  private static calculateNextRun(): Date | undefined {
    if (!this.cronTask || !this.jobStatus.enabled) return undefined;
    
    try {
      // Simple calculation for common cron patterns
      const schedule = this.jobStatus.schedule;
      const now = new Date();
      
      // For */X * * * * patterns (every X minutes)
      if (schedule.startsWith('*/')) {
        const minutes = parseInt(schedule.split(' ')[0].substring(2));
        const nextRun = new Date(now.getTime() + minutes * 60 * 1000);
        return nextRun;
      }
      
      // For 0 2 * * * (daily at 2 AM)
      if (schedule === '0 2 * * *') {
        const nextRun = new Date(now);
        nextRun.setHours(2, 0, 0, 0);
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        return nextRun;
      }
      
      // Default: add 1 hour for other patterns
      return new Date(now.getTime() + 60 * 60 * 1000);
      
    } catch (error) {
      console.error('Error calculating next run time:', error);
      return undefined;
    }
  }

  /**
   * Get current job status
   */
  static getStatus(): CronJobStatus {
    return {
      ...this.jobStatus,
      nextRun: this.calculateNextRun()
    };
  }

  /**
   * Update cron job configuration
   */
  static updateConfig(config: CronJobConfig): boolean {
    try {
      if (config.enabled) {
        return this.startJob(config);
      } else {
        return this.stopJob();
      }
    } catch (error) {
      console.error('Failed to update cron config:', error);
      return false;
    }
  }

  /**
   * Trigger manual sync (bypass schedule) - uses threshold logic
   */
  static async triggerManualSync(): Promise<boolean> {
    try {
      console.log('🔄 Triggering manual sync...');
      await this.executeSync(false);
      return true;
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CronJobService;