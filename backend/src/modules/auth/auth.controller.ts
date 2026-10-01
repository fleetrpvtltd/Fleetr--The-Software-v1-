import { Response } from 'express';
import { User } from '../../models/User.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, AppError } from '../../middleware/error-handler.js';

export const syncUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const { role, displayName, phone } = req.body;
  const { uid, email } = req.user;

  let user = await User.findOne({ firebaseUid: uid });

  if (user) {
    user.lastLoginAt = new Date();
    await user.save();
    return res.status(200).json({ status: 'success', data: { user } });
  }

  // Create new user
  if (!role) {
    throw new AppError('Role is required for first-time sync', 400);
  }

  user = await User.create({
    firebaseUid: uid,
    email: email,
    phone: phone,
    role: role,
    displayName: displayName,
    isActive: true,
    lastLoginAt: new Date()
  });

  res.status(201).json({ status: 'success', data: { user } });
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.mongoId) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await User.findById(req.user.mongoId).populate('companyProfile');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ status: 'success', data: { user } });
});
