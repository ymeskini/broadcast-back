import { z } from 'zod';

const envSchema = z.object({
  DB_ENCRYPTION_KEY: z.string(),
  EMAIL_API_KEY: z.string(),
  EMAIL_SUPPORT: z.string(),
  EMAIL_SIGNATURE_SECRET: z.string(),
  ENVIRONMENT: z.string().optional(),
  JWT_SECRET: z.string(),
  MONGO_DB_URL: z.string(),
  PORT: z.string().default('4444'),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.string().default('6379'),
  SENTRY_DSN: z.string().optional(),
  SESSION_DOMAIN: z.string(),
  SESSION_SECRET: z.string(),
  TWITCH_ID: z.string(),
  TWITCH_SECRET: z.string(),
});

export const envVariables = envSchema.parse(process.env);
export const __DEV__ = envVariables.ENVIRONMENT === 'development';
