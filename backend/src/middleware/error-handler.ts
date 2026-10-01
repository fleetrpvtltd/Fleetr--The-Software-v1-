import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof mongoose.Error.MongooseServerSelectionError || !mongoose.connection.readyState) {
      return res.status(503).json({
          status: 'error',
          code: 503,
          message: 'Service temporarily unavailable'
      });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.statusCode,
      message: err.message,
    });
  }

  // Handle other unknown errors
  res.status(500).json({
    status: 'error',
    code: 500,
    message: 'Internal Server Error',
  });
};
