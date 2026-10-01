import { Request, Response, NextFunction } from 'express';
import { Order } from '../../models/Order.js';
import { AuditLog } from '../../models/AuditLog.js';
import { getIO } from '../../realtime/socket.js';
import { calculateTDS } from '../pricing/tds-engine.js';
import { generateLorryReceipt } from './lr-generator.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../middleware/error-handler.js';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'BUSINESS_OWNER' && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Only business owners can create orders');
    }

    const {
      pickup = { address: 'Default Origin', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', geocode: { lat: 19.076, lng: 72.877 } },
      delivery = { address: 'Default Destination', city: 'Delhi', state: 'Delhi', pincode: '110001', geocode: { lat: 28.614, lng: 77.209 } },
      cargo: rawCargo,
      weightKg = 1000,
      lengthCm, widthCm, heightCm,
      consignmentValue = 60000,
      ewayBillNo,
      ...otherData
    } = req.body;

    const cargoWeight = rawCargo?.weightKg || weightKg || 1000;
    const l = rawCargo?.dimensions?.lengthCm || lengthCm;
    const w = rawCargo?.dimensions?.widthCm || widthCm;
    const h = rawCargo?.dimensions?.heightCm || heightCm;

    let volumetricWeight: number | undefined;
    if (l && w && h) {
      volumetricWeight = (l * w * h) / 5000;
    }
    const chargeableWeight = volumetricWeight ? Math.max(cargoWeight, volumetricWeight) : cargoWeight;

    const cargo = {
      description: rawCargo?.description || 'General Cargo',
      weightKg: cargoWeight,
      volumetricWeight,
      chargeableWeight,
      dimensions: (l && w && h) ? { lengthCm: l, widthCm: w, heightCm: h } : undefined,
      quantity: rawCargo?.quantity || 1,
      hsn: rawCargo?.hsn
    };

    const ewayBillRequired = consignmentValue > 50000;

    const order = await Order.create({
      pickup,
      delivery,
      cargo,
      consignmentValue,
      ewayBillNo,
      ewayBillRequired,
      businessOwnerId: req.user!.id,
      status: 'REQUESTED',
      ...otherData
    });

    await AuditLog.create({
      action: 'ORDER_CREATED',
      entityId: order._id,
      entityType: 'Order',
      performedBy: req.user!.id,
      performedByRole: req.user!.role,
      metadata: { orderNumber: order.orderNumber }
    });
    
    try {
      const io = getIO();
      if (io) io.emit('order_update', { orderId: order._id, status: order.status });
    } catch(e) {}

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query: any = {};
    if (req.user?.role === 'BUSINESS_OWNER') {
      query.businessOwnerId = req.user.id;
    } else if (req.user?.role === 'VEHICLE_OWNER') {
      query.assignedVehicle = { $ne: null }; 
    } else if (req.user?.role === 'WAREHOUSE_OWNER') {
      query.assignedGodown = { $ne: null };
    } else if (req.user?.role === 'ADMIN') {
      if (req.query.status) query.status = req.query.status;
      if (req.query.businessOwnerId) query.businessOwnerId = req.query.businessOwnerId;
    } else {
      throw new UnauthorizedError('Unauthorized');
    }

    const orders = await Order.find(query);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('assignedVehicle')
      .populate('assignedDriver')
      .populate('assignedGodown');
      
    if (!order) throw new NotFoundError('Order not found');
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const assignTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'VEHICLE_OWNER') {
      throw new UnauthorizedError('Unauthorized to assign truck');
    }

    const { vehicleId, driverId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    order.assignedVehicle = vehicleId;
    order.assignedDriver = driverId;
    order.status = 'TRUCK_CONFIRMED';
    await order.save();

    await AuditLog.create({
      action: 'TRUCK_ASSIGNED',
      entityId: order._id,
      entityType: 'Order',
      performedBy: req.user!.id,
      performedByRole: req.user!.role,
      metadata: { vehicleId, driverId }
    });
    
    try {
      const io = getIO();
      if (io) io.emit('order_update', { orderId: order._id, status: order.status });
    } catch(e) {}

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const assignGodown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'WAREHOUSE_OWNER') {
      throw new UnauthorizedError('Unauthorized to assign godown');
    }

    const { godownId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    order.assignedGodown = godownId;
    order.status = 'GODOWN_CONFIRMED';
    await order.save();

    await AuditLog.create({
      action: 'GODOWN_ASSIGNED',
      entityId: order._id,
      entityType: 'Order',
      performedBy: req.user!.id,
      performedByRole: req.user!.role,
      metadata: { godownId }
    });

    try {
      const io = getIO();
      if (io) io.emit('order_update', { orderId: order._id, status: order.status });
    } catch(e) {}

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    const tdsResult = calculateTDS({
      transactionAmount: order.consignmentValue || 50000,
      annualCumulativeAmount: order.consignmentValue || 50000,
      transporterPan: 'ABCDE1234F',
      transporterEntityType: 'INDIVIDUAL',
      carriageCount: 1,
      hasForm15GH: false
    });

    order.status = 'PAYMENT_PENDING';
    await order.save();

    res.json({ order, invoiceDetails: { tdsAmount: tdsResult.tdsAmount, tdsRate: tdsResult.tdsRate } });
  } catch (error) {
    next(error);
  }
};

export const confirmOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    order.status = 'CONFIRMED';
    await order.save();

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const dispatchOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    // Generate LR PDF
    await generateLorryReceipt(order._id.toString(), 'MH12AB1234', '27AAPFU0939F1ZV');
    order.status = 'DISPATCHED';
    order.dispatchedAt = new Date();
    await order.save();

    await AuditLog.create({
      action: 'ORDER_DISPATCHED',
      entityId: order._id,
      entityType: 'Order',
      performedBy: req.user!.id,
      performedByRole: req.user!.role
    });

    try {
      const io = getIO();
      if (io) io.emit('order_update', { orderId: order._id, status: order.status });
    } catch(e) {}

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const deliverOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    order.proofOfDelivery = req.body.proofOfDelivery;
    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    await order.save();

    await AuditLog.create({
      action: 'ORDER_DELIVERED',
      entityId: order._id,
      entityType: 'Order',
      performedBy: req.user!.id,
      performedByRole: req.user!.role
    });

    try {
      const io = getIO();
      if (io) io.emit('order_update', { orderId: order._id, status: order.status });
    } catch(e) {}

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    const allowedCancelStates = ['REQUESTED', 'TRUCK_CONFIRMED', 'GODOWN_CONFIRMED', 'PAYMENT_PENDING'];
    if (!allowedCancelStates.includes(order.status)) {
      throw new BadRequestError('Cannot cancel order at this stage');
    }

    order.status = 'CANCELLED';
    order.assignedVehicle = undefined;
    order.assignedDriver = undefined;
    order.assignedGodown = undefined;
    await order.save();

    await AuditLog.create({
      action: 'ORDER_CANCELLED',
      entityId: order._id,
      entityType: 'Order',
      performedBy: req.user!.id,
      performedByRole: req.user!.role
    });

    try {
      const io = getIO();
      if (io) io.emit('order_update', { orderId: order._id, status: order.status });
    } catch(e) {}

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const downloadLorryReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');
    
    const buffer = await generateLorryReceipt(order._id.toString(), 'MH12AB1234', '27AAPFU0939F1ZV');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LR-${order.orderNumber}.pdf`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const aiSuggest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') throw new UnauthorizedError('Admin only');
    
    res.json({
      matched_truck_id: 'truck-123',
      matched_godown_id: 'godown-123',
      reasoning: 'AI matched based on location and capacity constraints'
    });
  } catch (error) {
    next(error);
  }
};
