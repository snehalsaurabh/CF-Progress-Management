import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/models';

export const sendSuccess = <T>(
  res: Response, 
  data: T, 
  message: string = 'Success', 
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  res.status(statusCode).json(response);
};

export const sendPaginatedSuccess = <T>(
  res: Response,
  data: T[],
  pagination: PaginatedResponse<T>['pagination'],
  message: string = 'Success',
  statusCode: number = 200
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response, 
  message: string, 
  statusCode: number = 500, 
  error?: string
): void => {
  const response: ApiResponse<null> = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined
  };
  res.status(statusCode).json(response);
};