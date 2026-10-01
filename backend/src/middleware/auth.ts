import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase-admin.js';
import { User } from '../models/User.js';
import { AppError } from './error-handler.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: string;
        mongoId: string;
        id?: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    mongoId: string;
    id?: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    
    if (!adminAuth) {
      return next(new AppError('Authentication service unavailable', 503));
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error: any) {
      if (error.code === 'auth/id-token-expired') {
        return next(new AppError('Token expired', 401));
      }
      return next(new AppError('Invalid token', 401));
    }

    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    // Exception for /api/auth/sync endpoint to allow user creation
    if (!user && req.originalUrl !== '/api/auth/sync') {
      return next(new AppError('User not found in database. Please sync first.', 401));
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: user ? user.role : (decodedToken.role || 'USER'),
      mongoId: user ? (user._id as unknown as string).toString() : '',
      id: user ? (user._id as unknown as string).toString() : ''
    };

    next();
  } catch (error) {
    next(new AppError('Authentication failed', 500));
  }
};

export const checkRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Unauthorized', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }

    next();
  };
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = undefined;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!adminAuth) {
      req.user = undefined;
      return next();
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (user) {
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: user.role,
        mongoId: user._id as unknown as string
      };
    } else {
      req.user = undefined;
    }

    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
};
