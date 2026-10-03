import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  MONGO_URI: z.string().default('mongodb://localhost:27017/fleetr'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  ULIP_BASE_URL: z.string().optional(),
  ULIP_CLIENT_ID: z.string().optional(),
  ULIP_CLIENT_SECRET: z.string().optional(),
  ULIP_USERNAME: z.string().optional(),
  ULIP_PASSWORD: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  MAPMYINDIA_CLIENT_ID: z.string().optional(),
  MAPMYINDIA_CLIENT_SECRET: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  SMS_GATEWAY_API_KEY: z.string().optional(),
  SMS_GATEWAY_SENDER_ID: z.string().optional(),
  TRAI_DLT_PRINCIPAL_ENTITY_ID: z.string().optional(),
  TRAI_DLT_DEFAULT_HEADER: z.string().default('FLEETR'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  JWT_FALLBACK_SECRET: z.string().default('fallback-secret-change-me'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
