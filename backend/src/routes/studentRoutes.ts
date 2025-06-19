import { Router } from 'express';
import { StudentController } from '../controllers/studentController';
import { validateStudent, validateStudentUpdate } from '../middleware/validation';

const router = Router();

// GET /api/students/stats - Get student statistics
router.get('/stats', StudentController.getStudentStats);

// GET /api/students - Get all students with pagination and search
router.get('/', StudentController.getAllStudents);

// GET /api/students/:id - Get student by ID
router.get('/:id', StudentController.getStudentById);

// POST /api/students - Create new student
router.post('/', validateStudent, StudentController.createStudent);

// PUT /api/students/:id - Update student
router.put('/:id', validateStudentUpdate, StudentController.updateStudent);

// DELETE /api/students/:id - Delete student
router.delete('/:id', StudentController.deleteStudent);

export default router;