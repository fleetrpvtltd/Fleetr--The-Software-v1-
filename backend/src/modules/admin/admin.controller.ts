import { Request, Response, NextFunction } from 'express';
import { Order } from '../../models/Order.js';
import { Vehicle } from '../../models/Vehicle.js';
import { Driver } from '../../models/Driver.js';
import { Godown } from '../../models/Godown.js';
import { AuditLog } from '../../models/AuditLog.js';
import { CompanyProfile } from '../../models/CompanyProfile.js';
// User model mock if needed
// import { User } from '../../models/User.js'; 

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // const users = await User.find(req.query.role ? { role: req.query.role } : {});
    res.json({ message: 'Users list mock' });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await CompanyProfile.findOne({ userId: req.params.id });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    res.json({ message: 'User status updated mock' });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, performedBy } = req.query;
    let query: any = {};
    if (entityType) query.entityType = entityType;
    if (performedBy) query.performedBy = performedBy;
    
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getBreachLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'Breach logs mock' });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicles = await Vehicle.countDocuments();
    const drivers = await Driver.countDocuments();
    const warehouses = await Godown.countDocuments();
    
    res.json({
      vehicles,
      drivers,
      warehouses,
      revenue: 100000,
      activeAlerts: 2
    });
  } catch (error) {
    next(error);
  }
};

export const getPipeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pipeline = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(pipeline);
  } catch (error) {
    next(error);
  }
};
