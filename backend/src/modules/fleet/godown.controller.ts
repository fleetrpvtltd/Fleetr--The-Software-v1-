import { Request, Response, NextFunction } from 'express';
import { Godown } from '../../models/Godown.js';
import { getIO } from '../../realtime/socket.js';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../middleware/error-handler.js';

export const addGodown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'WAREHOUSE_OWNER' && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Only warehouse owners can add warehouses');
    }

    const godown = await Godown.create({
      ...req.body,
      ownerId: req.user.id
    });

    res.status(201).json(godown);
  } catch (error) {
    next(error);
  }
};

export const listGodowns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query: any = {};
    if (req.user?.role === 'WAREHOUSE_OWNER') {
      query.ownerId = req.user.id;
    } else if (req.user?.role === 'ADMIN' || req.user?.role === 'BUSINESS_OWNER') {
      query.isActive = true; // active warehouses for order matching
    } else {
      throw new UnauthorizedError('Unauthorized to view warehouses');
    }

    const godowns = await Godown.find(query);
    res.json(godowns);
  } catch (error) {
    next(error);
  }
};

export const getGodownDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const godown = await Godown.findById(req.params.id);
    if (!godown) throw new NotFoundError('Godown not found');

    res.json(godown);
  } catch (error) {
    next(error);
  }
};

export const updateGodown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const godown = await Godown.findById(req.params.id);
    if (!godown) throw new NotFoundError('Godown not found');

    if (req.user?.role !== 'ADMIN' && godown.ownerId.toString() !== req.user?.id) {
      throw new UnauthorizedError('Unauthorized');
    }

    Object.assign(godown, req.body);
    await godown.save();

    res.json(godown);
  } catch (error) {
    next(error);
  }
};

export const updateCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const godown = await Godown.findById(req.params.id);
    if (!godown) throw new NotFoundError('Godown not found');

    if (req.user?.role !== 'ADMIN' && godown.ownerId.toString() !== req.user?.id) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { usedCapacityCFT } = req.body;
    if (usedCapacityCFT !== undefined) {
      godown.usedCapacityCFT = usedCapacityCFT;
      await godown.save();

      // Emit Socket.IO event for live capacity board
      try {
        const io = getIO();
        if (io) {
            io.emit('db_update', { type: 'GODOWN_CAPACITY', godownId: godown._id, usedCapacityCFT });
        }
      } catch (e) {
          // Socket might not be initialized
      }
    }

    res.json(godown);
  } catch (error) {
    next(error);
  }
};
