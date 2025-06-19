import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseHandler';

export const validateStudent = (req: Request, res: Response, next: NextFunction): void => {
  const { name, email, phoneNumber, codeforcesHandle } = req.body;

  if (!name || !email || !phoneNumber || !codeforcesHandle) {
    sendError(res, 'Name, email, phone number, and Codeforces handle are required', 400);
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    sendError(res, 'Please provide a valid email address', 400);
    return;
  }

  // Phone validation
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phoneNumber)) {
    sendError(res, 'Please provide a valid phone number', 400);
    return;
  }

  // Codeforces handle validation
  const handleRegex = /^[a-zA-Z0-9_-]+$/;
  if (!handleRegex.test(codeforcesHandle) || codeforcesHandle.length < 3 || codeforcesHandle.length > 24) {
    sendError(res, 'Codeforces handle must be 3-24 characters and contain only letters, numbers, underscores, and hyphens', 400);
    return;
  }

  next();
};

export const validateStudentUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { email, phoneNumber, codeforcesHandle } = req.body;

  // Validate email if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendError(res, 'Please provide a valid email address', 400);
      return;
    }
  }

  // Validate phone if provided
  if (phoneNumber) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      sendError(res, 'Please provide a valid phone number', 400);
      return;
    }
  }

  // Validate Codeforces handle if provided
  if (codeforcesHandle) {
    const handleRegex = /^[a-zA-Z0-9_-]+$/;
    if (!handleRegex.test(codeforcesHandle) || codeforcesHandle.length < 3 || codeforcesHandle.length > 24) {
      sendError(res, 'Codeforces handle must be 3-24 characters and contain only letters, numbers, underscores, and hyphens', 400);
      return;
    }
  }

  next();
};