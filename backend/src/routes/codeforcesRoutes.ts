import { Router } from 'express';
import { CodeforcesController } from '../controllers/codeforcesController';

const router = Router();

// Handle validation routes
router.get('/validate/:handle', CodeforcesController.validateHandle);

// Sync routes
router.get('/sync/stats', CodeforcesController.getSyncStats);
router.post('/sync/all', CodeforcesController.syncAllStudents);
router.post('/sync/student/:id', CodeforcesController.syncStudentData);
router.post('/sync/force/:id', CodeforcesController.forceSyncStudent);

// Student analytics routes
router.get('/student/:id/contests', CodeforcesController.getContestHistory);
router.get('/student/:id/problems', CodeforcesController.getProblemStats);
router.get('/student/:id/submissions', CodeforcesController.getRecentSubmissions);

export default router; 