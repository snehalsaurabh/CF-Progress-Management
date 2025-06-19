# Codeforces Progress Manager API Documentation

## Overview
Backend API for managing student Codeforces progress tracking system.

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Validation**: Custom middleware
- **Architecture**: MVC pattern with class-based controllers

## Current Implementation Status

### ✅ Completed (Iteration 1-2)
- [x] TypeScript setup and configuration
- [x] MongoDB connection and configuration
- [x] Student model with validation
- [x] Complete CRUD operations for students
- [x] Input validation middleware
- [x] Error handling and response utilities
- [x] Pagination, search, and sorting
- [x] Student statistics endpoint

### 🚧 Upcoming Features
- [ ] Codeforces API integration
- [ ] Automated data sync with cron jobs
- [ ] Contest history tracking
- [ ] Problem solving analytics
- [ ] Email notification system
- [ ] CSV export functionality
- [ ] Inactivity detection

## API Endpoints

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Get all students with pagination/search |
| GET | `/api/students/stats` | Get student statistics |
| GET | `/api/students/:id` | Get student by ID |
| POST | `/api/students` | Create new student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

## Request/Response Format

### Create Student
```json
POST /api/students
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "codeforcesHandle": "johndoe123"
}
```

### Response Format
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "codeforcesHandle": "johndoe123",
    "currentRating": null,
    "maxRating": null,
    "lastDataUpdate": null,
    "emailNotificationsEnabled": true,
    "reminderEmailCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Environment Variables
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/codeforces-progress
JWT_SECRET=your_jwt_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CODEFORCES_API_BASE=https://codeforces.com/api
CRON_SCHEDULE=0 2 * * *
```

## Development

### Setup
```bash
npm install
npm run dev
```

### Validation Rules
- **Name**: 2-100 characters
- **Email**: Valid email format, unique
- **Phone**: Valid international format
- **Codeforces Handle**: 3-24 characters, alphanumeric with underscore/hyphen, unique
- **Rating**: 0-4000 (optional)

## Testing
Use the provided `test-api.http` file with REST Client extension in VS Code, or import into Postman.