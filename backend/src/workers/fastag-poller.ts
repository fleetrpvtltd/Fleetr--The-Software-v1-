import { createQueue, createWorker } from '../config/queue.js';
import { getFastagHistory } from '../modules/integrations/ulip/fastag.js';
import { Vehicle } from '../models/Vehicle.js';
import { FastagWaypoint } from '../models/FastagWaypoint.js';

const QUEUE_NAME = 'fastag-poller';

export const fastagPollerQueue = createQueue(QUEUE_NAME);

export const fastagPollerWorker = createWorker(QUEUE_NAME, async (job) => {
  try {
    const vehicles = await Vehicle.find({ isAvailable: true }).select('_id registrationNumber');
    
    for (const vehicle of vehicles) {
      try {
        const history = await getFastagHistory(vehicle.registrationNumber);
        
        for (const record of history) {
          // Check for deduplication using seqNo
          const exists = await FastagWaypoint.findOne({ vehicleId: vehicle._id, seqNo: record.seqNo });
          if (!exists) {
            await FastagWaypoint.create({
              vehicleId: vehicle._id,
              seqNo: record.seqNo,
              tollPlazaName: record.tollPlazaName,
              tollPlazaGeocode: record.tollPlazaGeocode ? {
                lat: parseFloat(record.tollPlazaGeocode.split(',')[0]),
                lng: parseFloat(record.tollPlazaGeocode.split(',')[1])
              } : undefined,
              readerReadTime: new Date(record.readerReadTime),
              txnAmount: record.txnAmount ? parseFloat(record.txnAmount) : undefined,
              txnStatus: record.txnStatus,
              laneDirection: record.laneDirection
            });
          }
        }
      } catch (err: any) {
        console.error(`[Fastag Poller Worker] Error polling for ${vehicle.registrationNumber}:`, err.message);
      }
    }
    
    console.log(`[Fastag Poller Worker] Successfully polled at ${new Date().toISOString()}`);
  } catch (error: any) {
    console.error(`[Fastag Poller Worker] Failed to poll fastag data:`, error.message);
    throw error;
  }
});

// Setup repeatable job (every 60 minutes)
export const setupFastagPoller = async () => {
  await fastagPollerQueue.add('poll', {}, {
    repeat: {
      pattern: '0 * * * *' // Every 60 minutes
    }
  });
};
