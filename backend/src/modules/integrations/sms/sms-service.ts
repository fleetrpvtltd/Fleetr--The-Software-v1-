import axios from 'axios';
import { env } from '../../../config/env.js';
import { NotificationLog } from '../../../models/NotificationLog.js';
import mongoose from 'mongoose';

export const sendSms = async (
  recipientPhone: string,
  message: string,
  templateId: string,
  recipientId: mongoose.Types.ObjectId
) => {
  const isMock = !env.SMS_GATEWAY_API_KEY;

  if (isMock) {
    console.log(`[MOCK SMS] To: ${recipientPhone}, Template: ${templateId}, Message: ${message}`);
    await NotificationLog.create({
      recipientId,
      recipientPhone,
      channel: 'SMS',
      templateId,
      contentPreview: message.substring(0, 50),
      status: 'DELIVERED',
      providerResponse: { mock: true }
    });
    return { success: true, mock: true };
  }

  try {
    // Example using a generic SMS gateway format
    const response = await axios.post('https://api.smsgateway.com/v1/send', {
      apiKey: env.SMS_GATEWAY_API_KEY,
      senderId: env.SMS_GATEWAY_SENDER_ID,
      to: recipientPhone,
      message,
      templateId, // Mandatory TRAI DLT templateId
      principalEntityId: env.TRAI_DLT_PRINCIPAL_ENTITY_ID
    });

    await NotificationLog.create({
      recipientId,
      recipientPhone,
      channel: 'SMS',
      templateId,
      contentPreview: message.substring(0, 50),
      status: 'DELIVERED',
      providerResponse: response.data
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    await NotificationLog.create({
      recipientId,
      recipientPhone,
      channel: 'SMS',
      templateId,
      contentPreview: message.substring(0, 50),
      status: 'FAILED',
      failureReason: error.message
    });
    
    console.error('Failed to send SMS:', error.message);
    throw error;
  }
};
