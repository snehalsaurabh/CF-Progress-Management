import { Types } from 'mongoose';
import Student, { IStudentDocument } from '../models/Student';
import Contest from '../models/Contest';
import Submission from '../models/Submission';
import RatingChange from '../models/RatingChange';
import CodeforcesService, {
  CodeforcesUser,
  CodeforcesRatingChange,
} from './codeforcesService';

export interface SyncSummary {
  submissionsAdded: number;
  ratingChangesAdded: number;
  contestsAdded: number;
  currentRating?: number;
  maxRating?: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: SyncSummary;
  error?: string;
}

export interface GlobalSyncStats {
  totalStudents: number;
  successfulSyncs: number;
  failedSyncs: number;
  results: Array<{
    studentId: string;
    handle: string;
    result: SyncResult;
  }>;
}

const API_DELAY_MS = 200;          // delay between CF API calls
const STUDENT_DELAY_MS = 1_000;    // delay between students to respect CF rate-limit

export default class DataSyncService {
  /* ------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------- */

  /** Sync a single student by Mongo ID */
  static async syncStudentData(studentId: string): Promise<SyncResult> {
    const student = await Student.findById(studentId);
    if (!student) {
      return { success: false, message: 'Student not found' };
    }
    return this.syncHandle(student.codeforcesHandle, student);
  }

  /** Sync all students in the database */
  static async syncAllStudents(): Promise<GlobalSyncStats> {
    const students = await Student.find({});
    const results: GlobalSyncStats['results'] = [];

    let successfulSyncs = 0;
    let failedSyncs = 0;

    for (const student of students) {
      const res = await this.syncHandle(student.codeforcesHandle, student);
      results.push({
        studentId: student._id?.toString() ?? '', // Add null check for _id
        handle: student.codeforcesHandle,
        result: res,
      });

      if (res.success) successfulSyncs++;
      else failedSyncs++;

      await this.delay(STUDENT_DELAY_MS);
    }

    return {
      totalStudents: students.length,
      successfulSyncs,
      failedSyncs,
      results,
    };
  }

  /* ------------------------------------------------------------------------
   * Core Sync Logic
   * --------------------------------------------------------------------- */

  /** Synchs everything for a given handle (helper used by public APIs) */
  private static async syncHandle(
    handle: string,
    student?: IStudentDocument | null,
  ): Promise<SyncResult> {
    try {
      // ensure we have a student document (can be injected to save 1 query)
      if (!student) {
        student = await Student.findOne({ codeforcesHandle: handle });
        if (!student) {
          return { success: false, message: `No student with handle ${handle}` };
        }
      }

      /* 1. Validate handle ------------------------------------------------ */
      if (!(await CodeforcesService.validateHandle(handle))) {
        return { success: false, message: `Invalid handle '${handle}'` };
      }

      /* 2. Fetch user stats / metadata ----------------------------------- */
      const { user, ratingChanges } = await CodeforcesService.getUserStats(
        handle,
      );

      /* 3. Sync contests / submissions / rating-changes ------------------ */
      const contestsAdded = await this.syncContests();
      const submissionsAdded = await this.syncSubmissions(
        handle,
        student._id as Types.ObjectId,
      );
      const ratingChangesAdded = await this.syncRatingChanges(
        handle,
        student._id as Types.ObjectId,
        ratingChanges,
      );
      /* 4. Update the Student document ----------------------------------- */
      await this.updateStudentRatings(student._id as Types.ObjectId, user);
      student.lastDataUpdate = new Date();
      await student.save();

      return {
        success: true,
        message: `Synced '${handle}' successfully`,
        data: {
          submissionsAdded,
          ratingChangesAdded,
          contestsAdded,
          currentRating: user.rating,
          maxRating: user.maxRating,
        },
      };
    } catch (err) {
      return {
        success: false,
        message: `Sync failed for '${handle}'`,
        error: (err as Error).message,
      };
    }
  }

  /* ------------------------------------------------------------------------
   * Low-level sync helpers
   * --------------------------------------------------------------------- */

  /** Download the global contest list once per sync round */
  private static async syncContests(): Promise<number> {
    try {
      const contests = await CodeforcesService.getContests(false);
      let inserted = 0;

      for (const c of contests) {
        const res = await Contest.updateOne(
          { contestId: c.contestId },
          c,
          { upsert: true },
        );
        if (res.upsertedCount) inserted++;
      }
      return inserted;
    } catch (err) {
      console.error('Contest sync error:', err);
      return 0;
    }
  }

  /** Get sync statistics */
static async getSyncStats(): Promise<{
  totalStudents: number;
  studentsWithData: number;
  studentsNeedingUpdate: number;
  totalSubmissions: number;
  totalRatingChanges: number;
  lastSyncTimes: Array<{ studentId: string; handle: string; lastUpdate: Date | null }>;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const [
    totalStudents,
    studentsWithData,
    studentsNeedingUpdate,
    totalSubmissions,
    totalRatingChanges,
    students
  ] = await Promise.all([
    Student.countDocuments({}),
    Student.countDocuments({ lastDataUpdate: { $ne: null } }),
    Student.countDocuments({
      $or: [
        { lastDataUpdate: null },
        { lastDataUpdate: { $lt: oneDayAgo } }
      ]
    }),
    Submission.countDocuments({}),
    RatingChange.countDocuments({}),
    Student.find({}, { _id: 1, codeforcesHandle: 1, lastDataUpdate: 1 }).lean()
  ]);

  const lastSyncTimes = students.map(student => ({
    studentId: student._id.toString(),
    handle: student.codeforcesHandle,
    lastUpdate: student.lastDataUpdate || null
  }));

  return {
    totalStudents,
    studentsWithData,
    studentsNeedingUpdate,
    totalSubmissions,
    totalRatingChanges,
    lastSyncTimes
  };
}

  /** Sync all submissions for a single handle */
  private static async syncSubmissions(
    handle: string,
    studentId: Types.ObjectId,
  ): Promise<number> {
    const submissions = await CodeforcesService.getUserSubmissions(handle);
    let added = 0;

    for (const s of submissions) {
      const exists = await Submission.exists({ submissionId: s.id });
      if (exists) continue;

      await Submission.create({
        studentId,
        codeforcesHandle: handle,
        submissionId: s.id,
        contestId: s.contestId,
        creationTimeSeconds: s.creationTimeSeconds,
        relativeTimeSeconds: s.relativeTimeSeconds,
        problem: s.problem,
        author: s.author,
        programmingLanguage: s.programmingLanguage,
        verdict: s.verdict,
        testset: s.testset,
        passedTestCount: s.passedTestCount,
        timeConsumedMillis: s.timeConsumedMillis,
        memoryConsumedBytes: s.memoryConsumedBytes,
      });
      added++;
    }
    return added;
  }

  /** Sync rating changes (contest history) */
  private static async syncRatingChanges(
    handle: string,
    studentId: Types.ObjectId,
    changes: CodeforcesRatingChange[],
  ): Promise<number> {
    let added = 0;
    for (const rc of changes) {
      const exists = await RatingChange.exists({
        codeforcesHandle: handle,
        contestId: rc.contestId,
      });
      if (exists) continue;

      await RatingChange.create({
        studentId,
        codeforcesHandle: handle,
        contestId: rc.contestId,
        contestName: rc.contestName,
        handle: rc.handle,
        rank: rc.rank,
        ratingUpdateTimeSeconds: rc.ratingUpdateTimeSeconds,
        oldRating: rc.oldRating,
        newRating: rc.newRating,
      });
      added++;
    }
    return added;
  }

  /** Update current & max rating on the Student doc */
  private static async updateStudentRatings(
    studentId: Types.ObjectId,
    user: CodeforcesUser,
  ): Promise<void> {
    const update: Partial<IStudentDocument> = {};
    if (user.rating !== undefined) update.currentRating = user.rating;
    if (user.maxRating !== undefined) update.maxRating = user.maxRating;
    if (Object.keys(update).length) {
      await Student.updateOne({ _id: studentId }, update);
    }
  }

  /* ------------------------------------------------------------------------
   * Utility
   * --------------------------------------------------------------------- */
  private static delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}

