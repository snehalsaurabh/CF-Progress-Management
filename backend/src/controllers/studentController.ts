import { Request, Response, NextFunction } from 'express';
import Student from '../models/Student';
import { sendSuccess, sendError, sendPaginatedSuccess } from '../utils/responseHandler';
import { StudentQueryParams } from '../types/api';
import DataSyncService from '../services/dataSyncService';

export class StudentController {
  // Get all students with pagination, search, and sorting
  static getAllStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query as StudentQueryParams;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      let searchQuery = {};
      if (search) {
        searchQuery = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { codeforcesHandle: { $regex: search, $options: 'i' } }
          ]
        };
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute queries in parallel
      const [students, totalCount] = await Promise.all([
        Student.find(searchQuery)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Student.countDocuments(searchQuery)
      ]);

      const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
        itemsPerPage: limitNum
      };

      sendPaginatedSuccess(res, students, pagination, 'Students retrieved successfully');
    } catch (error) {
      console.error('Get all students error:', error);
      sendError(res, 'Failed to retrieve students', 500, (error as Error).message);
    }
  };

  // Get student by ID
  static getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      const student = await Student.findById(id).lean();
      
      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      sendSuccess(res, student, 'Student retrieved successfully');
    } catch (error) {
      console.error('Get student by ID error:', error);
      sendError(res, 'Failed to retrieve student', 500, (error as Error).message);
    }
  };

  // Create new student
  static createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentData = req.body;
      
      const student = new Student(studentData);
      await student.save();

      sendSuccess(res, student, 'Student created successfully', 201);
    } catch (error) {
      console.error('Create student error:', error);
      
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyPattern)[0];
        sendError(res, `${field} already exists`, 400);
        return;
      }
      
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map((err: any) => err.message);
        sendError(res, errors.join(', '), 400);
        return;
      }

      sendError(res, 'Failed to create student', 500, (error as Error).message);
    }
  };

  // Update student
  static updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if Codeforces handle is being updated
      const oldStudent = await Student.findById(id);
      const isHandleChanged = oldStudent && updateData.codeforcesHandle && 
                             oldStudent.codeforcesHandle !== updateData.codeforcesHandle;

      const student = await Student.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      // If handle changed, trigger immediate Codeforces data fetch
      if (isHandleChanged) {
        student.lastDataUpdate = null; // Mark for update
        await student.save();
        
        // Trigger immediate data sync for the new handle
        try {
          console.log(`Triggering immediate sync for updated handle: ${updateData.codeforcesHandle}`);
          const syncResult = await DataSyncService.syncStudentData(id);
          if (syncResult.success) {
            console.log(`Successfully synced data for ${updateData.codeforcesHandle}`);
          } else {
            console.warn(`Failed to sync data for ${updateData.codeforcesHandle}:`, syncResult.message);
          }
        } catch (error) {
          console.error(`Error during immediate sync for ${updateData.codeforcesHandle}:`, error);
        }
      }

      sendSuccess(res, student, 'Student updated successfully');
    } catch (error) {
      console.error('Update student error:', error);
      
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyPattern)[0];
        sendError(res, `${field} already exists`, 400);
        return;
      }
      
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map((err: any) => err.message);
        sendError(res, errors.join(', '), 400);
        return;
      }

      sendError(res, 'Failed to update student', 500, (error as Error).message);
    }
  };

  // Delete student
  static deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const student = await Student.findByIdAndDelete(id);

      if (!student) {
        sendError(res, 'Student not found', 404);
        return;
      }

      sendSuccess(res, null, 'Student deleted successfully');
    } catch (error) {
      console.error('Delete student error:', error);
      sendError(res, 'Failed to delete student', 500, (error as Error).message);
    }
  };

  // Get student statistics
  static getStudentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await Student.aggregate([
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            studentsWithRating: { $sum: { $cond: [{ $ne: ['$currentRating', null] }, 1, 0] } },
            averageRating: { $avg: '$currentRating' },
            maxRating: { $max: '$currentRating' },
            studentsWithRecentUpdate: {
              $sum: {
                $cond: [
                  { $gte: ['$lastDataUpdate', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalStudents: 0,
        studentsWithRating: 0,
        averageRating: 0,
        maxRating: 0,
        studentsWithRecentUpdate: 0
      };

      sendSuccess(res, result, 'Student statistics retrieved successfully');
    } catch (error) {
      console.error('Get student stats error:', error);
      sendError(res, 'Failed to retrieve student statistics', 500, (error as Error).message);
    }
  };
}