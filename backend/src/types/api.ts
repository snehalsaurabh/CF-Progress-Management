import { Request } from 'express';

// Express request extensions
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Query parameter types
export interface StudentQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContestFilterParams {
  days?: '30' | '90' | '365';
  handle: string;
}

export interface ProblemFilterParams {
  days?: '7' | '30' | '90';
  handle: string;
}