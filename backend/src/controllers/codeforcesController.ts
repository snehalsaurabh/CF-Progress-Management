import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/responseHandler';
import CodeforcesService from '../services/codeforcesService';
import DataSyncService from '../services/dataSyncService';
import Student from '../models/Student';
import Submission from '../models/Submission';
import RatingChange from '../models/RatingChange';

export class CodeforcesController {
  /**
   * Validate a Codeforces handle
   */
  static validateHandle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { handle } = req.params;

      if (!handle) {
        sendError(res, 'Handle is required', 400);
        return;
      }

      const isValid = await CodeforcesService.validateHandle(handle);

      if (!isValid) {
        sendError(res, `Codeforces handle '${handle}' not found`, 404);
        return;
      }

      const userInfo = await CodeforcesService.getUserInfo(handle);
      sendSuccess(res, { valid: true, userInfo }, 'Handle is valid');
    } catch (error) {
      console.error('Validate handle error:', error);
      sendError(res, 'Failed to validate handle', 500, (error as Error).message);
    }
  };

  /**
   * Sync data for a specific student
   */
  static syncStudentData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await DataSyncService.syncStudentData(id);

      if (result.success) {
        sendSuccess(res, result.data, result.message);
      } else {
        sendError(res, result.message, 400, result.error);
      }
    } catch (error) {
      console.error('Sync student data error:', error);
      sendError(res, 'Failed to sync student data', 500, (error as Error).message);
    }
  };

  /**
   * Sync data for all students
   */
  static syncAllStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Starting sync for all students...');
      
      const result = await DataSyncService.syncAllStudents();

      sendSuccess(res, result, `Sync completed: ${result.successfulSyncs}/${result.totalStudents} successful`);
    } catch (error) {
      console.error('Sync all students error:', error);
      sendError(res, 'Failed to sync all students', 500, (error as Error).message);
    }
  };

  /**
   * Get sync statistics
   */
  static getSyncStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await DataSyncService.getSyncStats(); // Changed to getStats() based on lint error
      sendSuccess(res, stats, 'Sync statistics retrieved successfully');
    } catch (error) {
      console.error('Get sync stats error:', error);
      sendError(res, 'Failed to retrieve sync statistics', 500, (error as Error).message);
    }
  };

  /**
   * Get student's contest history with filtering
   */
  static getContestHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { days = '365' } = req.query;

      const student = await Student.findById(id);
      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      const daysNumber = parseInt(days as string);
      const cutoffTime = Math.floor(Date.now() / 1000) - (daysNumber * 24 * 60 * 60);

      const ratingChanges = await RatingChange.find({
        studentId: id,
        ratingUpdateTimeSeconds: { $gte: cutoffTime }
      }).sort({ ratingUpdateTimeSeconds: -1 });

      // Get contest participation data
      const contestData = ratingChanges.map(change => ({
        contestId: change.contestId,
        contestName: change.contestName,
        rank: change.rank,
        ratingChange: change.newRating - change.oldRating,
        oldRating: change.oldRating,
        newRating: change.newRating,
        date: new Date(change.ratingUpdateTimeSeconds * 1000)
      }));

      sendSuccess(res, {
        student: {
          id: student._id,
          name: student.name,
          codeforcesHandle: student.codeforcesHandle,
          currentRating: student.currentRating,
          maxRating: student.maxRating
        },
        contests: contestData,
        filterDays: daysNumber,
        totalContests: contestData.length
      }, 'Contest history retrieved successfully');
    } catch (error) {
      console.error('Get contest history error:', error);
      sendError(res, 'Failed to retrieve contest history', 500, (error as Error).message);
    }
  };

  /**
   * Get student's problem solving statistics
   */
  static getProblemStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { days = '30' } = req.query;

      const student = await Student.findById(id);
      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      const daysNumber = parseInt(days as string);
      const cutoffTime = Math.floor(Date.now() / 1000) - (daysNumber * 24 * 60 * 60);

      // Get submissions in the specified time period
      const submissions = await Submission.find({
        studentId: id,
        creationTimeSeconds: { $gte: cutoffTime }
      }).sort({ creationTimeSeconds: -1 });

      // Get accepted submissions only
      const acceptedSubmissions = submissions.filter(sub => sub.verdict === 'OK');

      // Get unique problems solved (by problem name to avoid duplicates)
      const uniqueProblemsSolved = new Set(
        acceptedSubmissions.map(sub => `${sub.problem.contestId}-${sub.problem.index}`)
      ).size;

      // Calculate most difficult problem solved
      const ratingsOfSolved = acceptedSubmissions
        .filter(sub => sub.problem.rating)
        .map(sub => sub.problem.rating as number);
      
      const mostDifficultRating = ratingsOfSolved.length > 0 ? Math.max(...ratingsOfSolved) : 0;

      // Calculate average rating
      const averageRating = ratingsOfSolved.length > 0 
        ? Math.round(ratingsOfSolved.reduce((sum, rating) => sum + rating, 0) / ratingsOfSolved.length)
        : 0;

      // Calculate average problems per day
      const averageProblemsPerDay = daysNumber > 0 ? Number((uniqueProblemsSolved / daysNumber).toFixed(2)) : 0;

      // Group problems by rating buckets
      const ratingBuckets: { [key: string]: number } = {
        '800-1000': 0,
        '1100-1300': 0,
        '1400-1600': 0,
        '1700-1900': 0,
        '2000-2200': 0,
        '2300+': 0,
        'Unrated': 0
      };

      acceptedSubmissions.forEach(sub => {
        const rating = sub.problem.rating;
        if (!rating) {
          ratingBuckets['Unrated']++;
        } else if (rating <= 1000) {
          ratingBuckets['800-1000']++;
        } else if (rating <= 1300) {
          ratingBuckets['1100-1300']++;
        } else if (rating <= 1600) {
          ratingBuckets['1400-1600']++;
        } else if (rating <= 1900) {
          ratingBuckets['1700-1900']++;
        } else if (rating <= 2200) {
          ratingBuckets['2000-2200']++;
        } else {
          ratingBuckets['2300+']++;
        }
      });

      // Create submission heatmap data (submissions per day)
      const heatmapData: { [date: string]: number } = {};
      submissions.forEach(sub => {
        const date = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0];
        heatmapData[date] = (heatmapData[date] || 0) + 1;
      });

      sendSuccess(res, {
        student: {
          id: student._id,
          name: student.name,
          codeforcesHandle: student.codeforcesHandle,
          currentRating: student.currentRating,
          maxRating: student.maxRating
        },
        statistics: {
          mostDifficultProblemRating: mostDifficultRating,
          totalProblemsSolved: uniqueProblemsSolved,
          averageRating,
          averageProblemsPerDay,
          totalSubmissions: submissions.length,
          acceptedSubmissions: acceptedSubmissions.length
        },
        ratingBuckets,
        heatmapData,
        filterDays: daysNumber
      }, 'Problem solving statistics retrieved successfully');
    } catch (error) {
      console.error('Get problem stats error:', error);
      sendError(res, 'Failed to retrieve problem statistics', 500, (error as Error).message);
    }
  };

  /**
   * Get recent submissions for a student
   */
  static getRecentSubmissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = '20', days = '7' } = req.query;

      const student = await Student.findById(id);
      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      const limitNumber = parseInt(limit as string);
      const daysNumber = parseInt(days as string);
      const cutoffTime = Math.floor(Date.now() / 1000) - (daysNumber * 24 * 60 * 60);

      const submissions = await Submission.find({
        studentId: id,
        creationTimeSeconds: { $gte: cutoffTime }
      })
      .sort({ creationTimeSeconds: -1 })
      .limit(limitNumber);

      const formattedSubmissions = submissions.map(sub => ({
        id: sub.submissionId,
        problem: {
          name: sub.problem.name,
          rating: sub.problem.rating,
          tags: sub.problem.tags,
          contestId: sub.problem.contestId,
          index: sub.problem.index
        },
        verdict: sub.verdict,
        programmingLanguage: sub.programmingLanguage,
        timeConsumedMillis: sub.timeConsumedMillis,
        memoryConsumedBytes: sub.memoryConsumedBytes,
        creationTime: new Date(sub.creationTimeSeconds * 1000)
      }));

      sendSuccess(res, {
        student: {
          id: student._id,
          name: student.name,
          codeforcesHandle: student.codeforcesHandle
        },
        submissions: formattedSubmissions,
        filterDays: daysNumber,
        totalShown: formattedSubmissions.length
      }, 'Recent submissions retrieved successfully');
    } catch (error) {
      console.error('Get recent submissions error:', error);
      sendError(res, 'Failed to retrieve recent submissions', 500, (error as Error).message);
    }
  };

  /**
   * Force sync student data (immediate sync without waiting for cron)
   */
  static forceSyncStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const student = await Student.findById(id);
      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      console.log(`Force syncing data for student: ${student.name} (${student.codeforcesHandle})`);
      
      const result = await DataSyncService.syncStudentData(id);

      if (result.success) {
        sendSuccess(res, result.data, `Force sync completed for ${student.codeforcesHandle}`);
      } else {
        sendError(res, result.message, 400, result.error);
      }
    } catch (error) {
      console.error('Force sync student error:', error);
      sendError(res, 'Failed to force sync student data', 500, (error as Error).message);
    }
  };
} 